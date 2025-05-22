"use client";
import { useEffect, useState } from "react";

interface Train {
  train: string;
  departure: string;
  destination: string;
}

type RawTimetableItem = {
  trip_id: string;
  departure_time?: string;
  trip_headsign?: string;
  // 其它字段如 arrival_time 可选
};

function getNextTrain(timetable: Train[]): Train | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let next: Train | null = null;
  let minDiff = Infinity;
  timetable.forEach((item) => {
    const [h, m] = item.departure.split(":").map(Number);
    const depMinutes = h * 60 + m;
    const diff = depMinutes - nowMinutes;
    if (diff >= 0 && diff < minDiff) {
      minDiff = diff;
      next = item;
    }
  });
  return next;
}

function convertRawTimetable(raw: RawTimetableItem[]): Train[] {
  return raw.map((item) => ({
    train: item.trip_id,
    departure: (item.departure_time || "").slice(0, 5),
    destination: item.trip_headsign || ""
  }));
}

// 获取日文表记
function getJapaneseTimetableType(type: string) {
  if (type === "Weekday") return "平日";
  if (type === "SaturdayHoliday") return "土曜/休日";
  return "";
}

export default function Home() {
  const [direction, setDirection] = useState("okayamato_suzukake"); // "okayamato_suzukake" 或 "suzukaketo_okayama"
  const [timetable, setTimetable] = useState<Train[]>([]);
  const [nextTrain, setNextTrain] = useState<Train | null>(null);
  const [now, setNow] = useState(new Date());
  const [timetableType, setTimetableType] = useState<string>("");

  useEffect(() => {
    // 判断今天是平日还是土曜/休日
    function getTimetableType(date: Date) {
      const day = date.getDay();
      // 周六、周日都用土祝日表
      if (day === 0 || day === 6) return "SaturdayHoliday";
      return "Weekday";
    }
    setTimetableType(getTimetableType(new Date()));
    const timetableType = getTimetableType(new Date());
    let file = "";
    if (direction === "okayamato_suzukake") {
      file = `timetable_${timetableType}.json`;
    } else {
      file = `timetable_reverse_${timetableType}.json`;
    }
    fetch(file, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("时刻表文件加载失败");
        return res.json();
      })
      .then((data) => {
        // 兼容 data 不是数组的情况
        const rawArray = Array.isArray(data) ? data : [];
        const trains = convertRawTimetable(rawArray);
        setTimetable(trains);
        setNextTrain(getNextTrain(trains));
      })
      .catch(() => {
        setTimetable([]);
        setNextTrain(null);
      });
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [direction, now]);

  let timeDiff = null;
  if (nextTrain) {
    const [h, m] = nextTrain.departure.split(":").map(Number);
    const depMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    timeDiff = depMinutes - nowMinutes;
  }

  // 只显示今天剩余的列车
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const remainingTrains = timetable.filter((item) => {
    const [h, m] = item.departure.split(":").map(Number);
    const depMinutes = h * 60 + m;
    return depMinutes >= nowMinutes;
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-0">
      <header className="w-full py-6 px-4 bg-white/80 dark:bg-gray-900/80 shadow-md rounded-b-3xl flex flex-col items-center">
        <h1
          className="text-3xl font-bold tracking-wide text-blue-700 dark:text-blue-300 cursor-pointer select-none"
          onClick={() => setDirection(direction === "okayamato_suzukake" ? "suzukaketo_okayama" : "okayamato_suzukake")}
        >
          {direction === "okayamato_suzukake" ? "大岡山 → すずかけ台" : "すずかけ台 → 大岡山"}
        </h1>
      </header>
      <main className="flex-1 w-full flex flex-col items-center justify-center px-4 gap-6 mt-4">
        <div className="w-full max-w-xs bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg p-6 flex flex-col items-center gap-3">
          <div className="text-lg text-gray-600 dark:text-gray-300">現在時刻</div>
          <div className="text-4xl font-mono font-semibold text-blue-600 dark:text-blue-300 mb-2">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div className="w-full h-px bg-gradient-to-r from-blue-300 via-purple-200 to-pink-200 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 my-2"></div>
          <div className="text-lg text-gray-600 dark:text-gray-300">次の電車</div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">{nextTrain ? nextTrain.departure : '直近の発車予定はありません'}</div>
          <div className="text-base text-gray-500 dark:text-gray-400">{nextTrain ? `行き先：${nextTrain.destination}` : ''}</div>
          <div className="text-base text-gray-500 dark:text-gray-400">{nextTrain && timeDiff !== null && timeDiff >= 0 ? `あと ${timeDiff} 分` : '-'}</div>
        </div>
        <div className="w-full max-w-xs mt-4">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">{`${now.getMonth() + 1}月${now.getDate()}日の時刻表${timetableType ? `（${getJapaneseTimetableType(timetableType)}）` : ''}`}</h2>
          <div className="flex flex-col gap-2">
            {remainingTrains.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 py-6">本日分の列車は終了しました</div>
            ) : remainingTrains.map((item, idx) => (
              <div
                key={item.train}
                className={`flex justify-between items-center px-4 py-2 rounded-xl shadow-sm transition-all duration-200
                  ${idx === 0 ? 'bg-gradient-to-r from-purple-100 via-blue-100 to-pink-100 dark:from-purple-900 dark:via-blue-900 dark:to-pink-900 border-2 border-purple-400 dark:border-purple-600 scale-105' :
                  'bg-white/80 dark:bg-gray-700/80'}
                `}
              >
                <span className={`font-bold text-lg ${idx === 0 ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'}`}>{item.departure}</span>
                <span className={`ml-2 text-base ${idx === 0 ? 'text-purple-700 dark:text-purple-200 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>{item.destination}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="w-full py-3 px-4 bg-white/80 dark:bg-gray-900/80 rounded-t-3xl shadow-inner flex flex-col items-center text-xs text-gray-400 mt-8">
        ラピッド急行トラッカー · モバイルWebアプリ
      </footer>
    </div>
  );
}
