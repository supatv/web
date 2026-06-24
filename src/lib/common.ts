import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export type TitleContext = {
	value: () => string;
	set: (newTitle: string) => void;
};

export const dateFormat = "YYYY-MM-DD";
export const timeFormat = "HH:mm:ss";
export const dateTimeFormat = `${dateFormat} ${timeFormat}`;

export const humanFileSize = (size: number) => {
	const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1000));
	return +(size / Math.pow(1000, i)).toFixed(2) * 1 + " " + ["B", "kB", "MB", "GB", "TB"][i];
};

export const formatDuration = (time: number, unit?: duration.DurationUnitType) => {
	const d = dayjs.duration(time, unit);

	const hours = Math.floor(d.asHours());
	const minutes = d.minutes().toString();
	const secs = d.seconds().toString().padStart(2, "0");

	return hours > 0 ? `${hours}:${minutes.padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
};
