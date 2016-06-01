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

var shelljs = require('shelljs');
var path    = require('path');
var fs      = require('fs');
var logger  = require('./utils').logger;
var util    = require('./utils').utilities;

function ParamedicAppUninstall(appPath, platform) {
    this.appPath = appPath;
    this.platform = platform;
}

ParamedicAppUninstall.prototype.uninstallApp = function (targetObj, app) {
    if (!targetObj || !targetObj.target)
        return;

    switch (this.platform) {
        case util.ANDROID:
            this.uninstallAppAndroid(targetObj, app);
            break;
        case util.IOS:
            this.uninstallAppIOS(targetObj, app);
            break;
        case util.WINDOWS:
            this.uninstallAppWindows(targetObj, app);
            break;
        default:
            break;
    }
};

ParamedicAppUninstall.prototype.uninstallAppAndroid = function (targetObj, app) {
    var uninstallCommand = 'adb -s ' + targetObj.target + ' uninstall ' + app;
    this.executeUninstallCommand(uninstallCommand);
};

ParamedicAppUninstall.prototype.uninstallAppWindows = function (targetObj, app) {
    var platformPath = path.join(this.appPath, 'platforms', 'windows');
    var packageJSPath = path.join(platformPath, 'cordova', 'lib', 'package.js');
    var programFilesPath = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles;
    var appDeployPath = path.join(programFilesPath, 'Microsoft SDKs',
          'Windows Phone', 'v8.1', 'Tools', 'AppDeploy', 'AppDeployCmd.exe');
    appDeployPath = '"' + appDeployPath + '"';

    if (fs.existsSync(packageJSPath)) {
        var packageJS = require(packageJSPath);
        var appId = packageJS.getAppId(platformPath);
        var uninstallCommand = appDeployPath + ' /uninstall ' + appId + ' /targetdevice:' + targetObj.target;
        this.executeUninstallCommand(uninstallCommand);
    }
    return;
};

ParamedicAppUninstall.prototype.uninstallAppIOS = function (targetObj, app) {
   var uninstallCommand = 'xcrun simctl uninstall ' + targetObj.simId + ' uninstall ' + app;
   this.executeUninstallCommand(uninstallCommand);
};

ParamedicAppUninstall.prototype.executeUninstallCommand = function (uninstallCommand) {
    logger.info('cordova-paramedic: Running command: ' + uninstallCommand);
    var uninstallResult = shelljs.exec(uninstallCommand, {silent: false, async: false});
    if (uninstallResult.code > 0) {
        logger.error('Failed to uninstall the app');
        logger.error('Error code: ' + uninstallResult.code);
    }
    return;
};

module.exports = ParamedicAppUninstall;
