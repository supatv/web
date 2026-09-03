import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { execSync } from "node:child_process";

const commitHash = execSync("git rev-parse HEAD").toString().trim();

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__COMMIT_HASH: JSON.stringify(commitHash),
		__BUILD_DATE: new Date(),
	},
});
