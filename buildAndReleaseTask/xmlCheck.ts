import tl = require('azure-pipelines-task-lib/task');
import fs = require('fs');
import path = require('path');
import xml2js = require('xml2js');

tl.setResourcePath(path.join(__dirname, 'task.json'));

let filters: string[] = tl.getDelimitedInput('Filters', '\n', true);
let sourceFolder: string = tl.getPathInput('SourceFolder', true, true);
let tag: string = tl.getInput('Tag', true);
let value: string = tl.getInput('Value', false);


sourceFolder = path.normalize(sourceFolder);

let allPaths: string[] = tl.find(sourceFolder); // default find options (follow sym links)
let matchedPaths: string[] = tl.match(allPaths, filters, sourceFolder); // default match options
let matchedFiles: string[] = matchedPaths.filter((itemPath: string) => !tl.stats(itemPath).isDirectory()); // filter-out directories

let failingFiles: string[] = [];

if (matchedFiles.length > 0) {

    let keys: string[] = tag.split('.');

    keys.forEach(function (element, index) {
        keys[index] = element.toLowerCase();
    });

    if (value != null) {
        value = value.toLowerCase();
    }



    var parser = new xml2js.Parser({ normalizeTags: true, explicitArray: false });

    matchedFiles.forEach(file => {
        parser.reset();
        let data = fs.readFileSync(file);
        parser.parseString(data,

            function (err: any, result: any) {
                try {
                    keys.forEach(key => {
                        result = result[key];
                    });
                    let tagValue: string = result;

                    if (tagValue == null) {
                        if (value == null) {
                            failingFiles.push(file + " : Tag is empty/ does not exist");
                        }
                        else
                        {
                            failingFiles.push(file + " : Can't find tag");
                        }
                    }
                    else if (tagValue.toLowerCase() != value) {
                        failingFiles.push(file + " : Value is not equal to " + value);
                    }
                }
                catch (err) {
                    failingFiles.push(file + " : Can't find tag");
                }
            });


    });
}
else {
    tl.setResult(tl.TaskResult.Succeeded, "No files found");
}


if (failingFiles.length > 0) {
    let errorMsg: string = failingFiles.join("\r\n")
    tl.setResult(tl.TaskResult.Failed, errorMsg, true);
}