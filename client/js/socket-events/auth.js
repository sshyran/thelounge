"use strict";

const $ = require("jquery");
const socket = require("../socket");
const storage = require("../localStorage");
const utils = require("../utils");
const {vueApp, getActiveWindowComponent} = require("../vue");

socket.on("auth", function(data) {
	// If we reconnected and serverHash differs, that means the server restarted
	// And we will reload the page to grab the latest version
	if (utils.serverHash > -1 && data.serverHash > -1 && data.serverHash !== utils.serverHash) {
		socket.disconnect();
		vueApp.$store.commit("isConnected", false);
		vueApp.currentUserVisibleError = "Server restarted, reloading…";
		location.reload(true);
		return;
	}

	if (data.serverHash > -1) {
		utils.serverHash = data.serverHash;

		vueApp.$store.commit("activeWindow", "SignIn");
	} else {
		getActiveWindowComponent().inFlight = false;
	}

	let token;
	const user = storage.get("user");

	if (!data.success) {
		if (vueApp.$store.state.activeWindow !== "SignIn") {
			socket.disconnect();
			vueApp.$store.commit("isConnected", false);
			vueApp.currentUserVisibleError = "Authentication failed, reloading…";
			location.reload();
			return;
		}

		storage.remove("token");

		getActiveWindowComponent().errorShown = true;
	} else if (user) {
		token = storage.get("token");

		if (token) {
			vueApp.currentUserVisibleError = "Authorizing…";
			$("#loading-page-message").text(vueApp.currentUserVisibleError);

			let lastMessage = -1;

			for (const network of vueApp.networks) {
				for (const chan of network.channels) {
					for (const msg of chan.messages) {
						if (msg.id > lastMessage) {
							lastMessage = msg.id;
						}
					}
				}
			}

			socket.emit("auth", {user, token, lastMessage});
		}
	}

	if (token) {
		return;
	}

	$("#loading").remove();
	$("#footer")
		.find(".sign-in")
		.trigger("click", {
			pushState: false,
		});
});
