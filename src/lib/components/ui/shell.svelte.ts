import { MediaQuery } from "svelte/reactivity";

import { browser } from "$app/environment";

const KEY = "sidebar-provider-state";

// one below Tailwind's `md`, so this and the sidebar's `max-md:` classes flip together
const MOBILE = "max-width: 47.99rem";

class Shell {
	#mobile = new MediaQuery(MOBILE);

	sidebarOpen = $state(browser ? window.localStorage.getItem(KEY) !== "false" : true);
	mobileNavOpen = $state(false);

	get isMobile() {
		return this.#mobile.current;
	}

	// whichever of the two the toggle button controls at this viewport
	get navOpen() {
		return this.#mobile.current ? this.mobileNavOpen : this.sidebarOpen;
	}

	// the mobile drawer is deliberately not persisted: it is a transient overlay, and reloading
	// a phone into a covered page would be a trap
	toggleSidebar() {
		if (this.#mobile.current) {
			this.mobileNavOpen = !this.mobileNavOpen;
			return;
		}

		this.sidebarOpen = !this.sidebarOpen;
		window.localStorage.setItem(KEY, this.sidebarOpen.toString());
	}
}

export const shell = new Shell();
