/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var path = require('path');
var fs = require('fs');
var logger = require('./utils').logger;
var exec = require('./utils').exec;
var PluginInfoProvider = require('cordova-common').PluginInfoProvider;

function PluginsManager(appRoot, storedCWD) {
    this.appRoot = appRoot;
    this.storedCWD = storedCWD;
}

PluginsManager.prototype.installPlugins = function(plugins) {
    for(var n = 0; n < plugins.length; n++) {
        var plugin = plugins[n];
        this.installSinglePlugin(plugin);
    }
};

PluginsManager.prototype.installTestsForExistingPlugins = function() {
    var installedPlugins = new PluginInfoProvider().getAllWithinSearchPath(path.join(this.appRoot, 'plugins'));
    var me = this;
    installedPlugins.forEach(function(plugin) {
        // there is test plugin available
        if (fs.existsSync(path.join(plugin.dir, 'tests', 'plugin.xml'))) {
            me.installSinglePlugin(path.join(plugin.dir, 'tests'));
        }
    });
    // this will list installed plugins and their versions
    this.showPluginsVersions();
};

PluginsManager.prototype.installSinglePlugin = function(plugin) {
    if (fs.existsSync(path.resolve(this.storedCWD, plugin))) {
        plugin = path.resolve(this.storedCWD, plugin);
    }

    logger.normal("cordova-paramedic: installing " + plugin);
    // var pluginPath = path.resolve(this.storedCWD, plugin);

    var plugAddCmd = exec('cordova plugin add ' + plugin);
    if(plugAddCmd.code !== 0) {
        logger.error('Failed to install plugin : ' + plugin);
        throw new Error('Failed to install plugin : ' + plugin);
    }
};

PluginsManager.prototype.showPluginsVersions = function() {
    logger.verbose("cordova-paramedic: versions of installed plugins: ");
    exec('cordova plugins');
};

module.exports = PluginsManager;
