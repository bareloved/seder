const { withXcodeProject } = require("expo/config-plugins");

module.exports = function disableScriptSandboxing(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();

    for (const key in buildConfigs) {
      const config = buildConfigs[key];
      if (typeof config === "object" && config.buildSettings) {
        config.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = "NO";
      }
    }

    return cfg;
  });
};
