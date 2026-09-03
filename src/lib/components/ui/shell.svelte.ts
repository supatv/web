import { browser } from "$app/environment";

const KEY = "sidebar-provider-state";

class Shell {
	sidebarOpen = $state(browser ? window.localStorage.getItem(KEY) !== "false" : true);
	mobileNavOpen = $state(false);

	toggleSidebar() {
		this.sidebarOpen = !this.sidebarOpen;
		window.localStorage.setItem(KEY, this.sidebarOpen.toString());
	}
}

export const shell = new Shell();
