// wing-popout.js

const MODULE_ID = "wing-table-map-helper";

let socket;

Hooks.once("socketlib.ready", () => {
  socket = socketlib.registerModule(MODULE_ID);
  socket.register("triggerPopout", triggerPopout);
});

function triggerPopout(type) {
	  console.log("WiNGTableMapHelper: REMOTE petition received:", type);
	  if (!game.modules.get("popout")?.active) {
		console.error("WiNGTableMapHelper: Popout module is not active on this client.");
		return;
	  }
	  
	  // Function to poll for the popout app instance.
	  const waitForApp = (checkerFn, callback) => {
		const interval = setInterval(() => {
		  const app = Object.values(ui.windows).find(checkerFn);
		  if (app) {
			clearInterval(interval);
			callback(app);
		  }
		}, 1000);
	  };

	  if (type === "chat") {
		console.log("WiNGTableMapHelper: Requesting chat popout from sidebar...");
		ui.sidebar.tabs.chat.renderPopout();
		waitForApp(
		  w => w.constructor.name === "ChatLog",
		  (popoutApp) => {
			console.log("WiNGTableMapHelper: Found chat popout window id:", popoutApp.appId);
			PopoutModule.popoutApp(popoutApp);
		  }
		);
	  } else if (type === "combat") {
		console.log("WiNGTableMapHelper: Requesting combat popout from sidebar...");
		ui.sidebar.tabs.combat.renderPopout();
		waitForApp(
		  w => w.constructor.name === "CombatTracker",
		  (popoutApp) => {
			console.log("WiNGTableMapHelper: Found combat popout window id:", popoutApp.appId);
			PopoutModule.popoutApp(popoutApp);
		  }
		);
	  } else {
		console.warn("WiNGTableMapHelper: Unknown popout type:", type);
		return;
	  }
	}

function getTableMapUser() {
  const id = game.settings.get("table-map", "userId");
  if (!id) return null;
  return game.users.get(id);
}

function triggerAll(userId) {
	if (userId) {
		socket.executeAsUser("triggerPopout", userId, "chat");
		socket.executeAsUser("triggerPopout", userId, "combat");
	}
}

Hooks.once("init", () => {
  // Hotkey registration
  game.keybindings?.register(MODULE_ID, "wing-popout-all", {
    name: "Trigger Popouts (Chat + Combat)",
    hint: "Ctrl+Shift+P",
    editable: [{ key: "KeyP", modifiers: ["Control", "Shift"] }],
    onDown: () => {
      console.log("WiNGTableMapHelper: Hotkey pressed");
      if (game.user?.isGM) {
        const tableUser = getTableMapUser();
        if (!tableUser || !tableUser.active) {
          ui.notifications.warn("Table Map user is not connected or not configured.");
          return;
        }
        triggerAll(tableUser.id);
      }
      return true;
    },
    restricted: true
  });
});

Hooks.on("getUserContextOptions", (_, options) => {
  if (!game.user.isGM) return;

  // Popout Chat
  options.push({
    name: "Popout Chat (Table Map)",
    icon: '<i class="fas fa-comments"></i>',
    condition: () => true,
    callback: (li) => {
      const userId = li.data("userId");
      if (!userId) {
        ui.notifications.error("userId not found");
        return;
      }
      socket.executeAsUser("triggerPopout", userId, "chat");
    }
  });

  // Popout Combat Tracker
  options.push({
    name: "Popout Combat (Table Map)",
    icon: '<i class="fas fa-swords"></i>',
    condition: () => true,
    callback: (li) => {
      const userId = li.data("userId");
      if (!userId) {
        ui.notifications.error("userId not found");
        return;
      }
      socket.executeAsUser("triggerPopout", userId, "combat");
    }
  });
  
  // Popout All
  options.push({
    name: "Popout All (Table Map)",
    icon: '<i class="fas fa-clone"></i>',
    condition: () => true,
    callback: (li) => {
      const userId = li.data("userId");
      if (!userId) {
        ui.notifications.error("userId not found");
        return;
      }
      triggerAll(userId);
    }
  });
});
