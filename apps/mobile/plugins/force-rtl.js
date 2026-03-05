const { withAppDelegate } = require("expo/config-plugins");

/**
 * Forces RTL layout at the native iOS level before React loads,
 * so it's active from first launch without needing a JS restart.
 */
module.exports = function forceRTL(config) {
  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes("RCTI18nUtil")) {
      // Force RTL before React Native starts
      contents = contents.replace(
        "let delegate = ReactNativeDelegate()",
        "RCTI18nUtil.sharedInstance().allowRTL(true)\n    RCTI18nUtil.sharedInstance().forceRTL(true)\n\n    let delegate = ReactNativeDelegate()"
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
