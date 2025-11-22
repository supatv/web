import tldList from "$lib/assets/data/tlds.json";

type Parsed = {
	protocol: string;
	host: string;
	rest: string;
	link: string;
};

const tldSet = new Set(tldList);

const isValidTld = (tld: string): boolean => {
	return tldSet.has(tld.toLowerCase());
};

const isValidIpv4 = (host: string): boolean => {
	const parts = host.split(".");
	if (parts.length !== 4) return false;
	return parts.every((part) => {
		if (!/^\d{1,3}$/.test(part)) return false;
		const num = Number(part);
		return num >= 0 && num < 256;
	});
};

const startsWithPort = (s: string): boolean => {
	for (let i = 0; i < Math.min(5, s.length); i++) {
		const c = s[i];
		if (i >= 1 && (c === "/" || c === "?" || c === "#")) return true;
		if (!/\d/.test(c)) return false;
	}
	return true;
};

const strip = (source: string): string => {
	while (source && "<*_~(".includes(source[0])) {
		source = source.slice(1);
	}
	while (source && ">?!.:,*~)".includes(source[source.length - 1])) {
		source = source.slice(0, -1);
	}
	return source;
};

const isValidDomainChar = (c: string): boolean => {
	const code = c.charCodeAt(0);
	return code >= 0x80 || /^[0-9a-zA-Z_.-]$/.test(c);
};

export default {
	parse: (source: string): Parsed | null => {
		let result: Parsed | null = null;
		let link = strip(source);
		let remaining = link;
		let protocol = "";

		// Protocol parsing
		if (/^https?:\/\//i.test(remaining)) {
			const match = remaining.match(/^https?:\/\//i);
			if (match) {
				protocol = match[0];
				remaining = remaining.slice(protocol.length);
			}
		}

		let host = remaining;
		let rest = "";
		let lastWasDot = true;
		let lastDotPos = -1;
		let nDots = 0;

		for (let i = 0; i < remaining.length; i++) {
			const c = remaining[i];

			if (c === ".") {
				if (lastWasDot) return null;
				lastDotPos = i;
				nDots++;
				lastWasDot = true;
				continue;
			}
			lastWasDot = false;

			if (c === ":") {
				host = remaining.slice(0, i);
				rest = remaining.slice(i);
				remaining = remaining.slice(i + 1);
				if (!startsWithPort(remaining)) return null;
				break;
			}

			if (["/", "?", "#"].includes(c)) {
				host = remaining.slice(0, i);
				rest = remaining.slice(i);
				break;
			}

			if (!isValidDomainChar(c)) {
				return null;
			}
		}

		if (lastWasDot || lastDotPos <= 0) return null;

		const tld = host.slice(lastDotPos + 1);
		const hostIsValid = (nDots === 3 && isValidIpv4(host)) || isValidTld(tld);

		if (hostIsValid) {
			// Try to account for parentheses nesting if extra characters were stripped
			if (link !== source && rest) {
				let nesting = 0;
				let lastClose = link.length;
				for (let i = link.indexOf(rest); i < source.length; i++) {
					const c = source[i];
					if (c === "(") nesting++;
					if (c === ")" && nesting > 0) {
						nesting--;
						if (nesting === 0) lastClose = i + 1;
					}
				}
				link = source.slice(0, Math.max(link.length, lastClose));
				rest = source.slice(link.length - rest.length, Math.max(link.length, lastClose));
			}

			result = {
				protocol,
				host,
				rest,
				link,
			};
		}

		return result;
	},
};
