// lapse.js
// (c) 2023 Michael Gochoco
// v1.0

const atob = require('atob');
const fs = require('fs');
const path = require('path');
const postPub = require('./PostPublish.js');

function strReplaceSingleQuotes(inText, reverse = false) {
	return !reverse ? inText.replace(/\'/gm, "%%A$CII39%%") : inText.replace(/%%A\$CII39%%/gm, "\'");
}

function strReplaceDoubleQuotes(inText, reverse = false) {
	return !reverse ? inText.replace(/\"/gm, "%%A$CII34%%") : inText.replace(/%%A\$CII34%%/gm, "\"");
}

function strReplaceQuotes(t, r) {
	return strReplaceDoubleQuotes(strReplaceSingleQuotes(t,r),r);
}

var args = process.argv.slice(2);

if(args.length > 0) {
	var argTypeObj = {
		json: false,
		test: false,
		help: false,
		version: false
	};

	var argTypes = {
		json: 'json',
		j: 'json',
		test: 'test',
		t: 'test',
		help: 'help',
		h: 'help',
		version: 'version',
		v: 'version',
		stringParam: 'stringParam',
		s: 'stringParam',
		directory: 'directory',
		d: 'directory',
		babelize: 'babelize',
		b: 'babelize',
		es5: 'es5',
		e: 'es5',
		minify: 'minify',
		m: 'minify',
		regenerator: 'regenerator',
		r: 'regenerator',
		babelizeFiles: 'babelizeFiles',
		f: 'babelizeFiles',
		convertSpriteSheet: 'convertSpriteSheet',
		c: 'convertSpriteSheet',
		convertJSONAudio: 'convertJSONAudio',
		a: 'convertJSONAudio',
	};

	var fileDir = null;
	var argsFlags = args.slice();
	var errHappened = args.length == 0;
	var errMsg = "";

	// find -d directory if found remove the flag and directory args
	var index = 0;
	while(index < argsFlags.length) {
		var item = argsFlags[index];
		if(item == '-d' || item == '-directory') {
			argsFlags.splice(index, 1);
			item = argsFlags[index];
			if(item && !item.startsWith('-')) {
				fileDir = item;
				argsFlags.splice(index, 1);
			}
		}
		index++;
	}
	
	var flags = argsFlags.filter(i => i.startsWith('-'));
	var hasFlags = flags.length > 0;
	flags.forEach(i => argTypeObj[ argTypes[i.substring(1)] ] = true);

	// files array
	var fileArr = argsFlags.filter(i => !i.startsWith('-'));
	var hasFiles = fileArr.length > 0;

	if(!errHappened) {
		if(argTypeObj.help) {
			var helpDoc = `pubTool [-json] file [fileDir]
file      pubData file (.DAT)
fileDir   optional specify directory for pubData relative filepaths
-json     pubData is delivered in json format
-help     this info
-test     evaluate and print file paths only
-version  version info`;
			console.log(helpDoc);
		}
		else if(argTypeObj.version)
			console.log("3.3.21");
		else if(hasFiles) {
			function processFile(pubData, fileDirectory) {
				var result = false;

				function loadJSON({index, options, babelOptions, hasSpriteSheets = false, spriteSheetArray = [], hasAudioSwap = false, audioArray = [], libNS = "lib"}) {
					return postPub.loadHTML(path.resolve(fileDirectory, index), options, babelOptions, hasSpriteSheets, spriteSheetArray.map(i=>path.resolve(fileDirectory, i)), hasAudioSwap, audioArray.map(i=>path.resolve(fileDirectory, i)), libNS);
				}

				var profileIndex = pubData.search(/(\n.*)?{\"PUBLISHINGPROFILE\":\".*\"}$/m);
				if(profileIndex > -1) pubData = pubData.substring(0, profileIndex);

				if(!argTypeObj.json && !argTypeObj.stringParam) pubData = atob(pubData);
				var loadObj = JSON.parse(pubData);

				if(argTypeObj.convertSpriteSheet) result = postPub.convertJSONSpriteSheetToEaselJS(path.resolve(fileDirectory, loadObj.index), loadObj.spriteSheetArray.map(i => path.resolve(fileDirectory, i)));
				else if(argTypeObj.convertJSONAudio) result = postPub.convertJSONAudio(path.resolve(fileDirectory, loadObj.index), loadObj.audioArray.map(i => path.resolve(fileDirectory, i)));
				else if(argTypeObj.babelize) result = postPub.babelize(path.resolve(fileDirectory, loadObj.index), loadObj.babelOptions);
				else result = loadJSON(loadObj);

				return result;
			}

			if(argTypeObj.babelizeFiles) { // babelize files
				if(!postPub.babelizeFiles(fileArr, {babel: argTypeObj.es5, minify: argTypeObj.minify, regenerator: argTypeObj})) {
					errHappened = true;
					errMsg = "Error: Unable to babelize files";	
				}
			}
			else if(argTypeObj.stringParam) {
				if(!!fileDir) {
					if(argTypeObj.test)
						console.log("file directory path:\n" + path.resolve(path.normalize(fileDir)));
					else {
						fileArr.forEach(file => errHappened = errHappened || !processFile(atob(file), fileDir));
						if(!!errHappened) errMsg = "Error: Command fail";
					}
				}
				else {
					errHappened = true;
					errMsg = "Must set a directory! Refer to -directory flag";
				}
			}
			else {
				fileArr.filter(i => fs.existsSync(i) && !fs.lstatSync(i).isDirectory()).forEach(file => {
					if(argTypeObj.test) {
						console.log("file path:\n" + path.resolve(path.normalize(file)));
						console.log("file directory path:\n" + path.resolve(path.normalize(fileDir || path.dirname(file))));
					}
					else {
						fileDir = fileDir || path.dirname(file);
						errHappened = errHappened || !processFile(fs.readFileSync(file, 'utf8'), fileDir);
						if(!!errHappened) errMsg = "Error: Command fail";
					}
				});
			}
		}
		else {
			errHappened = true;
			errMsg = "Error: No valid parameters set";
		}
	}
	else
		errHappened = true;

	if(errHappened)
		console.log("Error: " + errMsg);
}