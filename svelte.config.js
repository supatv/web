import cloudflareAdapter from "@sveltejs/adapter-cloudflare";
import staticAdapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: process.env.NODE_ENV === "production" ? cloudflareAdapter() : staticAdapter(),
		prerender: {
			origin: "https://tv.supa.sh",
		},
	},
};

export default config;
