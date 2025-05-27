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

    switch (type) {
      case 'chat':
        console.log("WiNGTableMapHelper: Requesting chat popout from sidebar...");
        ui.sidebar.tabs.chat.renderPopout();
        waitForApp(
          w => w.constructor.name === "ChatLog",
          (popoutApp) => {
            console.log("WiNGTableMapHelper: Found chat popout window id:", popoutApp.appId);
            PopoutModule.popoutApp(popoutApp);
          }
        );
        break;
        
      case 'combat':
        console.log("WiNGTableMapHelper: Requesting combat popout from sidebar...");
        ui.sidebar.tabs.combat.renderPopout();
        waitForApp(
          w => w.constructor.name === "CombatTracker",
          (popoutApp) => {
            console.log("WiNGTableMapHelper: Found combat popout window id:", popoutApp.appId);
            PopoutModule.popoutApp(popoutApp);
          }
        );
        break;
        
      case 'levels':
        if (!isLevelsActive()) {
          console.warn("WiNGTableMapHelper: Levels module is not active");
          ui.notifications.warn("Levels module is not active.");
          return;
        }
        if (!isLevelsPopoutEnabled()) {
          console.warn("WiNGTableMapHelper: Levels popout is not enabled");
          ui.notifications.warn("Levels popout is not enabled.");
          return;
        }
        console.log("WiNGTableMapHelper: Requesting levels popout...");
        CONFIG.Levels.UI.render(true);
        waitForApp(
          w => w.id === "levelsUI",
          (popoutApp) => {
            console.log("WiNGTableMapHelper: Found levels popout window id:", popoutApp.appId);
            PopoutModule.popoutApp(popoutApp);
          }
        );
        break;
        
      default:
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
		if (isLevelsActive() && isLevelsPopoutEnabled()) {
			socket.executeAsUser("triggerPopout", userId, "levels");
		}
	}
}

function hotkeyRegistration() {
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
}

function contextMenuPopoutChat(options) {
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
}

function contextMenuPopoutCombat(options) {
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
}

function contextMenuPopoutLevels(options) {
  options.push({
    name: "Popout Levels (Table Map)",
    icon: '<i class="fas fa-layer-group"></i>',
    condition: () => true,
    callback: (li) => {
      const userId = li.data("userId");
      if (!userId) {
        ui.notifications.error("userId not found");
        return;
      }
      socket.executeAsUser("triggerPopout", userId, "levels");
    }
  });
}

function contextMenuPopoutAll(options) {
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
}

function registerUseLevelsSetting() {
  console.log("Registering use levels setting");
  game.settings.register(MODULE_ID, "useLevels", {
    name: "Add popout option for Ripper93's Levels Module",
    hint: "WARNING: This setting will override the normal operation of Levels allowing you to display it's UI for a non-GM player. " +
    "This was not how Levels was designed to work, but it can be of use if you are having visibility problems on TableMap with multiple tokens",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}

function isLevelsActive() {
  return game.modules.get("levels")?.active;
}

function isLevelsPopoutEnabled() {
  return game.settings.get(MODULE_ID, "useLevels");
}

Hooks.once("init", () => {
  hotkeyRegistration();
  registerUseLevelsSetting();
});

Hooks.on("getUserContextOptions", (_, options) => {
  if (!game.user.isGM) return;

  contextMenuPopoutChat(options);
  contextMenuPopoutCombat(options);
  if (isLevelsActive() && isLevelsPopoutEnabled()) {
    contextMenuPopoutLevels(options);
  }
  contextMenuPopoutAll(options);
});
