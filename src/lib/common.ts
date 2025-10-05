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
