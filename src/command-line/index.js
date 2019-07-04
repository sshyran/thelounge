"use strict";

const log = require("../log");
const fs = require("fs");
const path = require("path");
const colors = require("chalk");
const program = require("commander");
const Helper = require("../helper");
const Utils = require("./utils");

program.version(Helper.getVersion(), "-v, --version")
	.option(
		"-c, --config <key=value>",
		"override entries of the configuration file, must be specified for each entry that needs to be overriden",
		Utils.parseConfigOptions
	)
	.on("--help", Utils.extraHelp);

// Parse options from `argv` returning `argv` void of these options.
const argvWithoutOptions = program.parseOptions(process.argv);

Helper.setHome(process.env.THELOUNGE_HOME || Utils.defaultHome());

// Check config file owner and warn if we're running under a different user
if (process.getuid) {
	const uid = process.getuid();

	if (uid === 0) {
		log.warn(`You are currently running The Lounge as root. ${colors.bold.red("We highly discourage running as root!")}`);
	}

	fs.stat(path.join(Helper.getHomePath(), "config.js"), (err, stat) => {
		if (!err && stat.uid !== uid) {
			log.warn("Config file owner does not match the user you are currently running The Lounge as.");
			log.warn("To avoid issues, you should execute The Lounge commands under the same user.");
		}
	});
}

Utils.checkOldHome();

// Merge config key-values passed as CLI options into the main config
Helper.mergeConfig(Helper.config, program.config);

require("./start");

if (!Helper.config.public && !Helper.config.ldap.enable) {
	require("./users");
}

require("./install");
require("./uninstall");
require("./upgrade");
require("./outdated");

// `parse` expects to be passed `process.argv`, but we need to remove to give it
// a version of `argv` that does not contain options already parsed by
// `parseOptions` above.
// This is done by giving it the updated `argv` that `parseOptions` returned,
// except it returns an object with `args`/`unknown`, so we need to concat them.
// See https://github.com/tj/commander.js/blob/fefda77f463292/index.js#L686-L763
program.parse(argvWithoutOptions.args.concat(argvWithoutOptions.unknown));

if (!program.args.length) {
	program.help();
}
