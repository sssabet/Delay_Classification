/**
Triggers a download of `data` using the provided filename.
Encapulates some browser-specific API differences.

@param {string} filename The filename to use.
@param {string} data The data to be saved.
@returns {undefined}
*/
function downloadData(filename, data) {
    if (navigator.appName === "Microsoft Internet Explorer") {
        var blob = new Blob([data], {
            type: "text/plain"
        });
        window.navigator.msSaveBlob(blob, filename);
        return;
    }
    if ("download" in document.createElement("a") && navigator.userAgent.toLowerCase().indexOf("firefox") === -1) { //So far only chrome AND not firefox.
        var downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(new Blob([data], {
            type: "text/plain"
        }));
        downloadLink.click();
        window.URL.revokeObjectURL(downloadLink.href); //Release object: https://developer.mozilla.org/en-US/docs/Web/API/URL.revokeObjectURL
        return;
    };
    window.location.href = "data:application/x-download;charset=utf-8," + encodeURIComponent(data);
}
/**
Defines a message that should be logged, consisting of level, location, and the content.
The messages _should_ be subdivided in five types according to their relevance:
1. Fatal
2. Error
3. Warn
4. Info
5. Debug
 
DEVELOPER: This class is used internally by LogConsole and should not be accessed directly.

@class LogMessage

@param {string} logLevel type of message
@param {string} location location in the code
@param {string} msg the message itself
*/
function LogMessage(logLevel, location, msg) {
    this.logLevel = "" + logLevel;
    this.location = "" + location;
    this.msg = msg;
}

/**
Provides basic logging functionality (prints to console).

DEVELOPER: All the messages (instances of class `LogMessage`) are saved in an array and can be accessed via `TheFragebogen.logger.logMessages` as long as this logger is used.
@class LogConsole
*/
function LogConsole() {
    this.logMessages = new Array();
    this.debug("LogConsole.constructor()", "Start");
}

LogConsole.prototype.debug = function(location, msg) {
    this.logMessages.push(new LogMessage("DEBUG", location, msg));
    if (console.debug === undefined) {
        //For IE console.debug is not defined.
        console.debug = console.log;
    }
    console.debug("DEBUG: " + location + ": " + msg);
};

LogConsole.prototype.info = function(location, msg) {
    this.logMessages.push(new LogMessage("INFO", location, msg));
    console.info("INFO: " + location + ": " + msg);
};

LogConsole.prototype.warn = function(location, msg) {
    this.logMessages.push(new LogMessage("WARN", location, msg));
    console.warn("WARN: " + location + ": " + msg);
};

LogConsole.prototype.error = function(location, msg) {
    this.logMessages.push(new LogMessage("ERROR", location, msg));
    console.error("ERROR: " + location + ": " + msg);
};

LogConsole.prototype.fatal = function(location, msg) {
    this.logMessages.push(new LogMessage("FATAL", location, msg));
    console.error("FATAL: " + location + ": " + msg);
};

/**
 Defines the accessor for the logger.
 Can be redefined later if desired.
*/
TheFragebogen = {
    logger: new LogConsole()
};
/**
A Screen is a UI component that shows a UI.
It represents a sheet of paper containing several items of a questionnaire.
In TheFragebogen only one screen is shown at a time.

@abstract
@class Screen
*/
function Screen() {
    this.readyCallback = null;
}
Screen.prototype.constructor = Screen;
/**
Creates the UI.
@abstract
*/
Screen.prototype.createUI = function() {};
/**
(optional) Inform the screen its UI gets shown.
@abstract
*/
Screen.prototype.start = function() {};
/**
Destroy and release the UI.
@abstract
*/
Screen.prototype.releaseUI = function() {};
/**
Returns the stored data in CSV format.
@abstract
*/
Screen.prototype.getDataCSV = function() {};
/**
Set the callback for ready-state changed. 
@param {function} [callback] 
*/
Screen.prototype.setOnReadyStateChangedCallback = function(callback) {
    if (! (callback instanceof Function)) {
        TheFragebogen.logger.error(this.constructor.name + ".setOnReadyStateChangedCallback()", "Provided callback ist not a function.");
        return false;
    }

    TheFragebogen.logger.debug(this.constructor.name + ".setOnReadyStateChangedCallback()", "called.");
    this.readyCallback = callback;
    return true;
};
/**
Call onReadyStateChanged-callback
*/
Screen.prototype._sendReadyStateChangedCallback = function() {
    if (! (this.readyCallback instanceof Function)) {
        TheFragebogen.logger.error(this.constructor.name + "._sendReadyStateChangedCallback()", "called, but no readyCallback set.");
        return;
    }
    TheFragebogen.logger.debug(this.constructor.name + "._sendReadyStateChangedCallback()", "called");
    this.readyCallback();
};
/**
Is the screen ready and TheFragebogen can continue to the next one?
@abstract
@returns {boolean} true Is the screen ready?
*/
Screen.prototype.isReady = function() {
    return true;
};

/**
A screen that shows all data that is _currently_ stored by the ScreenController.

Reports nothing.

@class ScreenDataPreview
@augments Screen

@param {string} [className] CSS class
*/
function ScreenDataPreview(className) {
    Screen.call(this);

    this.data = null;
    this.className = className;

    this.getDataFromScreencontroller = null;

    this.node = null;
}

ScreenDataPreview.prototype = Object.create(Screen.prototype);
ScreenDataPreview.prototype.constructor = ScreenDataPreview;

ScreenDataPreview.prototype.createUI = function() {
    //Request data
    if (this.getDataFromScreencontroller instanceof Function) {
        TheFragebogen.logger.debug(this.constructor.name + "._sendGetDataFromScreencontroller()", "called");
        this.data = this.getDataFromScreencontroller();
    }

    this.node = document.createElement("div");
    this.node.innerHTML = "<h1>Data Preview</h1>";
    this.node.className = this.className;

    var tblBody = document.createElement("tbody");
    for (i = 0; i < this.data.length; i++) {
        var row = document.createElement("tr");
        for (j = 0; j < this.data[i].length; j++) {

            var cell = document.createElement(i == 0 ? "th" : "td");

            cell.innerHTML = this.data[i][j];
            row.appendChild(cell);
        }
        tblBody.appendChild(row);
    }

    var tbl = document.createElement("table");
    tbl.appendChild(tblBody);
    this.node.appendChild(tbl);

    var button = document.createElement("input");
    button.type = "button";
    button.value = "Next";
    button.onclick = (this._sendReadyStateChangedCallback).bind(this);

    this.node.appendChild(button);

    return this.node;
};

ScreenDataPreview.prototype.releaseUI = function() {
    this.node = null;
    this.data = null;
};
/**
Set the function pointer for requesting the ScreenController's _raw_ data.
@param {function} function
@returns {boolean} true if parameter was a function
*/
ScreenDataPreview.prototype.setGetRawDataCallback = function(getDataFromScreencontroller) {
    if (getDataFromScreencontroller instanceof Function) {
        TheFragebogen.logger.debug(this.constructor.name + ".setGetRawDataCallback()", "called");
        this.getDataFromScreencontroller = getDataFromScreencontroller;
        return true;
    }
    return false;
};

/**
A screen that shows an iFrame.
Ready is reported after the defined threshold of URL changes occured.

Reports the final URL.
Reports the time between ScreenIFrame.start() and the final URL change, i.e., the one that lead to ready.
ATTENTION: This might be misleading depending on your timing requirements!

@class ScreenIFrame
@augments Screen

@param {string} [className] CSS class
@param {string} [url]
@param {number} [urlChangesToReady] Number of URL changes until ready is reported.
*/
function ScreenIFrame(className, url, urlChangesToReady) {
    Screen.call(this);

    this.className = className;

    this.startTime = null;
    this.duration = null;

    this.urlStart = url;
    this.urlFinal = null;

    this.urlChanges = -1;
    this.urlChangesToReady = !isNaN(urlChangesToReady) && urlChangesToReady < 1 ? urlChangesToReady : 1;

    this.node = null;

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: url as " + this.urlStart + ", urlChangesToReady as" + this.urlChangesToReady);
}
ScreenIFrame.prototype = Object.create(Screen.prototype);
ScreenIFrame.prototype.constructor = ScreenIFrame;

ScreenIFrame.prototype.createUI = function() {
    this.urlChanges = -1; //Ignore the first load
    this.node = document.createElement("iframe");
    this.node.className = this.className;
    this.node.src = this.urlStart;

    this.node.onload = function(event) {
        this.urlChanges += 1;

        TheFragebogen.logger.debug(this.constructor.name + ".iframe.onload():", this.urlStartChanges + " of " + this.maxUrlChanges + " viewed.");

        if (this.urlStartChanges >= this.maxUrlChanges) {
            this.duration = Date.now() - this.startTime;
            this.urlStartChanges = 0;

            try {
                this.urlFinal = event.target.contentWindow.location.href;
            } catch(error) {
                TheFragebogen.logger.warn(this.constructor.name + ".iframe.onload()", "TheFragebogen-Error: Could not get urlFinal from iFrame. Security limitation?");
                this.urlFinal = "TheFragebogen-Error: Could not get urlFinal of the iframe. Security limitation?";
            }
            this._sendReadyStateChangedCallback();
        }
    }.bind(this);

    return this.node;
};
ScreenIFrame.prototype.start = function() {
    this.startTime = Date.now();
};
ScreenIFrame.prototype.isReady = function() {
    return this.duration !== null;
};
ScreenIFrame.prototype.releaseUI = function() {
    this.node = null;
    this.startTime = null;
    TheFragebogen.logger.info(this.constructor.name + ".releaseUI()", this.duration);
};
ScreenIFrame.prototype.getDataCSV = function() {
    return[["url", "finalURL", "duration"], ["url", "finalURL", "duration"], ["", "", ""], [this.urlStart, this.urlFinal, this.duration]];
};

/**
A screen that presents one or more UIElements.
All UIElements are visible and enabled by default.
Ready is reported when all UIElements reported ready AND the user pressed the presented button.

DEVERLOPER: To inherit this class, `ScreenUIElements.apply(this, arguments)` MUST be used instead of `ScreenUIElements.call(this, arguments)`.

@class ScreenUIElements
@augments Screen
@param {string} [className] CSS class
@param {array} arguments an array containing the UIElements of the screen
*/
function ScreenUIElements(className) {
    Screen.call(this);

    var localArguments = Array.prototype.slice.call(arguments);

    if (typeof(className) !== "string" || typeof(className) === undefined || className === null) {
        this.className = "";
    } else {
        this.className = className;
        localArguments.splice(0, 1);
    }

    for (var i in localArguments) {
        if (! (localArguments[i] instanceof UIElement)) {
            TheFragebogen.logger.error(this.constructor.name + "():", "This argument (index " + i + " is not an UIElement: " + localArguments[i]);
        }
    }
    this.elements = localArguments.filter(function(element) {
        return element instanceof UIElement;
    });
    
    if (this.elements.length < 1) {
        TheFragebogen.logger.error(this.constructor.name + "():", "No UIElements were passed to constructor.");
    }

    this.node = null;
}
ScreenUIElements.prototype = Object.create(Screen.prototype);
ScreenUIElements.prototype.constructor = ScreenUIElements;

ScreenUIElements.prototype.createUI = function() {
    this.node = document.createElement("div");
    this.node.className = this.className;

    for (var index in this.elements) {
        if (this.elements[index].createUI === undefined) {
            TheFragebogen.logger.warn(this.constructor.name + ".createUI():", "Element[" + index + "] has no 'createUI' method");
            continue;
        }

        var node = this.elements[index].createUI();
        if (node !== undefined && node !== null) {
            this.node.appendChild(node);
        }
    }

    var button = document.createElement("input");
    button.type = "button";
    button.value = "weiter";
    button.onclick = (this._sendReadyStateChangedCallback).bind(this);

    this.node.appendChild(button);

    return this.node;
};

ScreenUIElements.prototype.releaseUI = function() {
    TheFragebogen.logger.info(this.constructor.name + ".release():", "");
    this.node = null;
    for (var index in this.elements) {
        this.elements[index].releaseUI();
    }
};
/**
Enables all the elements of the screen.
*/
ScreenUIElements.prototype.start = function() {
    TheFragebogen.logger.info(this.constructor.name + ".start()", "");

    for (var index in this.elements) {
        this.elements[index].setEnabled(true);
    }
};
/**
Are all UIElementInteractive ready?
@returns {boolean}
*/
ScreenUIElements.prototype.isReady = function() {
    var ready = true;

    for (var index in this.elements) {
        if (this.elements[index] instanceof UIElementInteractive) {
            if (!this.elements[index].isReady()) {
                ready = false;
            }
            this.elements[index].markRequired();
        }
    }
    return ready;
};
/**
 Returns the data of QuestionnaireItem (UIElementInteractive are omitted) in CSV format.
 The data of each questionnaire item is subdivided in 4 columns:
 1. QuestionnaireItem.getType()
 2. QuestionnaireItem.getQuestion()
 3. QuestionnaireItem.getAnswerOptions()
 4. QuestionnaireItem.getAnswer()
 @returns {array}
 */
ScreenUIElements.prototype.getDataCSV = function() {
    var data = [new Array(), new Array(), new Array(), new Array()];

    for (var index in this.elements) {
        if ((this.elements[index] instanceof QuestionnaireItem)) {
            data[0].push(this.elements[index].getType());
            data[1].push(this.elements[index].getQuestion());
            data[2].push(this.elements[index].getAnswerOptions());
            data[3].push(this.elements[index].getAnswer());
        }
    }
    return data;
};

/**
A screen that presents one or more UIElements and reports ready _automatically_ when all UIElements are ready.
All UIElements are visible and enabled by default.

@class ScreenUIElements
@augments Screen
@param {string} [className] CSS class
@param {array} arguments an array containing the UIElements of the screen
*/
function ScreenUIElementsAuto() {
    ScreenUIElements.apply(this, arguments);
}
ScreenUIElementsAuto.prototype = Object.create(ScreenUIElements.prototype);
ScreenUIElementsAuto.prototype.constructor = ScreenUIElementsAuto;

ScreenUIElementsAuto.prototype.createUI = function() {
    this.node = document.createElement("div");
    this.node.className = this.className;

    for (var index in this.elements) {
        if (this.elements[index].createUI === undefined) {
            TheFragebogen.logger.warn(this.constructor.name + ".createUI():", "Element[" + index + "] has no 'createUI' method");
            continue;
        }
        var node = this.elements[index].createUI();
        if (node !== undefined && node !== null) {
            this.node.appendChild(node);
        }
        if (this.elements[index].setOnReadyStateChangedCallback instanceof Function) {
            this.elements[index].setOnReadyStateChangedCallback((this._sendReadyStateChangedCallback).bind(this));
        }
    }

    return this.node;
};

/**
A screen that presents one or more UIElements.
All UIElements are visible by default.
UIElements are enabled one after another, i.e., if its predecessing UIElement reported to be ready the next one is enabled.

@class ScreenUIElementsSequential
@augments ScreenUIElements

@param {string} [className] CSS class
@param {array} arguments an array containing the UIElements of the screen
*/
function ScreenUIElementsSequential(className) {
    ScreenUIElements.apply(this, arguments);
    this.currentElementIndex = null;
}
ScreenUIElementsSequential.prototype = Object.create(ScreenUIElements.prototype);
ScreenUIElementsSequential.prototype.constructor = ScreenUIElementsSequential;

ScreenUIElementsSequential.prototype.start = function() {
    for (var index in this.elements) {
        if (this.elements[index].setOnReadyStateChangedCallback instanceof Function) {
            this.elements[index].setOnReadyStateChangedCallback((this._onUIElementReady).bind(this));
        }
        this.elements[index].setEnabled(false);
    }

    this.currentElementIndex = 0; 
    this.elements[this.currentElementIndex].setEnabled(true);
};
/**
Callback to enable the following UIElementInteractive.
 */
ScreenUIElementsSequential.prototype._onUIElementReady = function() {
    TheFragebogen.logger.info(this.constructor.name + "._onUIElementReady()", "called");

    var nextElementIndex = -1;
    for (var i = this.currentElementIndex + 1; i < this.elements.length; i++) {
        this.elements[i].setEnabled(true);
        if (this.elements[i] instanceof UIElementInteractive) {
            nextElementIndex = i;
            break;
        }
    }
    
    if (nextElementIndex == -1) {
        TheFragebogen.logger.error(this.constructor.name + + "._onUIElementReady()", "There is no next UIElement to enable left.");
        return;
    }

    this.elements[this.currentElementIndex].setEnabled(false);
    this.currentElementIndex = nextElementIndex;
    this.elements[this.currentElementIndex].setEnabled(true);
};

/**
A screen that waits for the defined duration while presenting a message.
Fancy animation(s) can be shown using CSS.

@class ScreenWait
@augments Screen
@param {string} [className] CSS class
@param {number} [time=2] The time to wait in seconds
@param {string} [html="Please wait..."] The HTML content to be presented.
*/
function ScreenWait(className, time, html) {
    Screen.call(this);

    this.node = null;

    this.className = className;
    this.time = !isNaN(time) ? Math.abs(time) * 1000 : 2;
    this.html = typeof html === "string" ? html : "Please wait...";

    this.timeoutHandle = null;
    this.readyCallback = null;

    TheFragebogen.logger.debug(this.constructor.name, "Set: time as " + this.time + " and html as " + this.html);
}
ScreenWait.prototype = Object.create(Screen.prototype);
ScreenWait.prototype.constructor = ScreenWait;

ScreenWait.prototype.createUI = function() {
    this.node = document.createElement("div");
    this.node.className = this.className;
    this.node.innerHTML = this.html;

    return this.node;
};

ScreenWait.prototype._startTimer = function() {
    TheFragebogen.logger.info(this.constructor.name + "._startTimer()", "New screen will be displayed in " + this.time + "ms.");
    this.timeoutHandle = setTimeout((this._onWaitTimeReached).bind(this), this.time);
};
/**
Starts the timer.
*/
ScreenWait.prototype.start = function() {
    this._startTimer();
};
ScreenWait.prototype._onWaitTimeReached = function() {
    this._sendReadyStateChangedCallback();
};
ScreenWait.prototype.releaseUI = function() {
    clearTimeout(this.timeoutHandle);
    this.timeoutHandle = null;
    this.node = null;
};
/**
Base class of Screens that handle data export.

Displays a HTML message.

@abstract
@class ScreenWaitData

@augments Screen
@augments ScreenWait

@param {string} [className=""] CSS class
@param {number} time Time to wait in seconds
@param {string} message The message to display (HTML)
 */
function ScreenWaitData(className, time, message) {
    ScreenWait.call(this, className, time, message);

    this.data = null;

    this.getDataCallback = null;
}
ScreenWaitData.prototype = Object.create(Screen.prototype);
ScreenWaitData.prototype.constructor = ScreenWaitData;

ScreenWaitData.prototype.setGetDataCallback = function(getDataCallback) {
    if (getDataCallback instanceof Function) {
        TheFragebogen.logger.debug(this.constructor.name + ".setGetDataCallback()", "called");
        this.getDataCallback = getDataCallback;
        return true;
    }
    return false;
};

ScreenWaitData.prototype._sendGetDataCallback = function() {
    if (this.getDataCallback instanceof Function) {
        TheFragebogen.logger.debug(this.constructor.name + "._sendGetDataCallback()", "called");
        this.data = this.getDataCallback();
    }
};

/**
A screen that downloads the currently stored data of the questionnaire in CSV format as a file.
A message is presented while uploading.
Default timeout: 300s; should not be relevant.

@class ScreenWaitDataDownload
@augments Screen
@augments ScreenWait
@augments ScreenWaitData
@param {string} [className] CSS class
@param {string} [message="Downloading data"] Message to be displayed.
@param {string} [filename="TheFragebogen.csv"] Name of the file to be downloaded
 */
function ScreenWaitDataDownload(className, message, filename) {
    ScreenWaitData.call(this, className === "string" ? className : "", 300, typeof message === "string" ? message : "Downloading data");

    this.filename = (typeof filename === "string" ? filename : "TheFragebogen.csv");

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: filename as " + this.filename);
}

ScreenWaitDataDownload.prototype = Object.create(ScreenWaitData.prototype);
ScreenWaitDataDownload.prototype.constructor = ScreenWaitDataDownload;

ScreenWaitDataDownload.prototype.createUI = function() {
    this.node = document.createElement("div");

    var span = document.createElement("span");
    span.innerHTML = this.html;
    this.node.appendChild(span);

    return this.node;
};

/**
On start(), the screenController.requestDataCSV() is called with this.callbackDownload() as callback.
ScreenController needs to set the callback accordingly.
*/
ScreenWaitDataDownload.prototype.start = function() {
    this._sendGetDataCallback();
    this.callbackDownload(this.data);
};
/**
Callback to download data.
@param {string} data
*/
ScreenWaitDataDownload.prototype.callbackDownload = function(data) {
    TheFragebogen.logger.info(this.constructor.name + ".callbackDownload()", data);
    downloadData(this.filename, data);
    this._sendReadyStateChangedCallback();
};

/**
A screen that uploads the currently stored data of the questionnaire in CSV format to a webserver via AJAX (HTTP POST).
A message is presented while uploading.
Default timeout: 4s.

USER: Be aware of Cross-site origin policy: http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
The web server must be configured accordingly if upload URL is different than the URL the questionnaire was loaded from.

@class ScreenWaitDataUpload

@augments Screen
@augments ScreenWait
@augments ScreenWaitData

@param {string} [className] CSS class
@param {string} [url]
@param {number} [timeout=4] timeout in seconds
@param {string} [message="Uploading data. Please wait..."]
@param {string} [httpParamaterName="data"]
@param {string} [failMessage="Upload failed. Data will be downloaded to local computer now."]
@param {boolean} [nextScreenOnFail=true] Continue to next screen if upload failed.
*/
function ScreenWaitDataUpload(className, url, timeout, message, httpParameterName, failMessage, nextScreenOnFail) {
    ScreenWaitData.call(this, className, !isNaN(timeout) ? Math.abs(timeout) : 4, typeof message === "string" ? message : "Uploading data. Please wait...");

    this.failMessage = (typeof failMessage === "string" ? failMessage : "Upload failed. Data will be downloaded to local computer now.");
    this.httpParameterName = (typeof httpParameterName === "string" ? httpParameterName : "data");
    this.nextScreenOnFail = (typeof nextScreenOnFail === "boolean") ? nextScreenOnFail : true;

    this.url = url;
    this.request = null;
    this.retryCount = 0;
    this.data = null;
    this.retry = 0;

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: httpParameterName as " + this.httpParameterName);
}

ScreenWaitDataUpload.prototype = Object.create(ScreenWaitData.prototype);
ScreenWaitDataUpload.prototype.constructor = ScreenWaitDataUpload;

ScreenWaitDataUpload.prototype.createUI = function() {
    this.node = document.createElement("div");

    var span = document.createElement("span");
    span.innerHTML = this.html;
    this.node.appendChild(span);

    return this.node;
};
/**
On start(), the screenController.requestDataCSV() is called with this.callbackUpload() as callback.
*/
ScreenWaitDataUpload.prototype.start = function() {
    this.retryCount = 0;

    this._sendGetDataCallback();
    this.callbackUpload(this.data);
};
/**
Callback to upload data.
@param {string} data
*/
ScreenWaitDataUpload.prototype.callbackUpload = function(data) {
    TheFragebogen.logger.info(this.constructor.name + ".callbackUpload()", "Starting upload to " + this.url);

    this.retry = null;
    this.retryCount++;
    this.data = data;

    this.request = new XMLHttpRequest();
    this.request.open("POST", this.url, true);
    this.request.timeout = this.time;

    this.request.ontimeout = (this._ontimeout).bind(this);
    this.request.onload = (this._onload).bind(this);
    this.request.onerror = (this._onerror).bind(this);

    this.request.send(this.httpParameterName + "=" + data);
};
/**
Callback if upload was successful; screen is then ready to continue.
*/
ScreenWaitDataUpload.prototype._onload = function() {
    if (this.request.readyState === 4 && this.request.status === 200) {
        TheFragebogen.logger.info(this.constructor.name + ".callbackUpload()", "Successful.");
        if (this.request.responseText !== "") {
            TheFragebogen.logger.info(this.constructor.name + "._onload()", this.request.responseText);
        }

        this._sendReadyStateChangedCallback();
    } else {
        TheFragebogen.logger.error(this.constructor.name + "._onload()", "Request to " + this.url + " failed with status code " + this.request.status);
        this.retryCount = 4;
        this._onerror();
    }

    this.request = null;
};
/**
Callback if upload failed and schedules a retry.
*/
ScreenWaitDataUpload.prototype._onerror = function() {
    var span = document.createElement("span");
    span.innerHTML = "" + "Upload failed. Retrying in 5 seconds.";
    this.node.appendChild(span);
    this.retry = setTimeout((this.callbackUpload).bind(this), 5000, this.data);

    TheFragebogen.logger.error(this.constructor.name + ".callbackUpload()", "Upload failed with HTTP code: " + this.request.status + ". Retrying in 5 seconds.");
};
/**
Callback if timeout.
*/
ScreenWaitDataUpload.prototype._ontimeout = function() {
    TheFragebogen.logger.error(this.constructor.name + ".callbackUpload()", "Upload got timeout after " + this.time + "ms.");
    this._onerror();
};
ScreenWaitDataUpload.prototype.releaseUI = function() {
    this.node = null;

    if (this.retry !== null) {
        clearTimeout(this.retry);
    }

    if (this.request instanceof XMLHttpRequest) {
        this.request.abort();
    }
    this.request = null;
};

/**
A ScreenController coordinates a questionnaire, i.e., showing a set of Screens and storing the gathered data.
This ScreenController shows the Screens in a predefined order.
Applies lifecycle management for the Screens.

ATTENTION: `ScreenController.init(parentNode)` must be called before using a ScreenController.

@class ScreenController

@param {array} The Screens to be used.

Callbacks:
* ScreenController.callbackScreenFinished() {boolean}: The current screen is done; continue to next screen?

*/
function ScreenController() {
    if (arguments.length === 0) TheFragebogen.logger.fatal(this.constructor.name + ".constructor", "No screen available.");

    var localArguments = [].concat.apply([], arguments); //Flatten the potential array.
    for (var i in localArguments) {
        if (! (localArguments[i] instanceof Screen)) TheFragebogen.logger.error(this.constructor.name + "():", "This argument (index " + i + " is not a Screen: " + localArguments[i] + " and will be ignored.");
    }
    this.screen = localArguments.filter(function(element) {
        return element instanceof Screen;
    });

    this.callbackScreenFinished = null;

    this.currentScreenIndex = null;
    this.screenContainerNode = null;
}
ScreenController.prototype.constructor = ScreenController;
/**
Init this instance of ScreenController; most important providing the HTML element to be used.

@param {HTMLElement} [parentNode] The parent HTML element; must be a container.
*/
ScreenController.prototype.init = function(parentNode) {
    if (this.screenContainerNode !== null) {
        TheFragebogen.logger.warn(this.constructor.name + ".init()", "Is already initialized.");
        return;
    }

    TheFragebogen.logger.debug(this.constructor.name + ".init()", "Start");

    this.screenContainerNode = parentNode;

    for (i = 0; i < this.screen.length; i++) {
        if (this.screen[i].setGetDataCallback instanceof Function) {
            this.screen[i].setGetDataCallback((this.requestDataCSV).bind(this));
        }
        if (this.screen[i].setGetRawDataCallback instanceof Function) {
            this.screen[i].setGetRawDataCallback((this.requestDataArray).bind(this));
        }
        if (this.screen[i].setOnReadyStateChangedCallback instanceof Function) {
            this.screen[i].setOnReadyStateChangedCallback((this.nextScreen).bind(this));
        }
    }

    this.currentScreenIndex = 0;
};
ScreenController.prototype.setCallbackScreenFinished = function(callback) {
    if (!callback instanceof Function) {
        TheFragebogen.logger.warn(this.constructor.name + ".setCallbackScreenFinished()", "Callback is not a function. Ignoring it.");
        return;
    }
    this.callbackScreenFinished = callback;
};
/**
Add an additional screen at the end.Appends a screen and returns the index.

@param {Screen} screen
@returns {number} The index of the just added screen; in case of failure -1.
*/
ScreenController.prototype.addScreen = function(screen) {
    if (!screen instanceof Screen) {
        TheFragebogen.logger.warn(this.constructor.name + ".addScreen()", "This screen is not a screen. Ignoring it.");
        return -1;
    }

    TheFragebogen.logger.info(this.constructor.name + ".addScreen()", "Appending screen.");
    this.screen.push(screen);

    if (screen.setGetDataCallback instanceof Function) {
        screen.setGetDataCallback((this.requestDataCSV).bind(this));
    }
    if (screen.setGetRawDataCallback instanceof Function) {
        screen.setGetRawDataCallback((this.requestDataArray).bind(this));
    }
    if (screen.setOnReadyStateChangedCallback instanceof Function) {
        screen.setOnReadyStateChangedCallback((this.nextScreen).bind(this));
    }

    return this.screen.length - 1;
};
/**
Starts the screenController, i.e., showing the screen in their respective order.
*/
ScreenController.prototype.start = function() {
    this.screenContainerNode.innerHTML = "";
    this._displayUI();
};
/**
Proceeds to the next Screen if the current reported ready.
*/
ScreenController.prototype.nextScreen = function() {
    if (this.screenContainerNode === null) {
        TheFragebogen.logger.error(this.constructor.name + ".nextScreen()", "Please call init() before.");
        return;
    }

    if (this.screen[this.currentScreenIndex].isReady instanceof Function && this.screen[this.currentScreenIndex].isReady()) {

        if (this.callbackScreenFinished instanceof Function && !this.callbackScreenFinished()) { //Should we proceed to the next screen or is this handled by external command?
            return;
        }

        if (this.isLastScreen()) {
            TheFragebogen.logger.warn(this.constructor.name + ".nextScreen()", "No further screen available.");
            return;
        }

        this.screen[this.currentScreenIndex].releaseUI();
        this.screenContainerNode.innerHTML = '';

        this.currentScreenIndex++;
        this._displayUI();
    }
};
ScreenController.prototype._displayUI = function() {
    if (this.currentScreenIndex >= this.screen.length) {
        TheFragebogen.logger.error(this.constructor.name + "._displayUI()", "There is no screen with index " + this.currentScreenIndex + ".");
        return;
    }

    TheFragebogen.logger.info(this.constructor.name + "._displayUI()", "Displaying next screen with index: " + this.currentScreenIndex + ".");

    //Scroll back to top
    window.scrollTo(0, document.body.scrollLeft);

    //Add the new screen
    var screen = this.screen[this.currentScreenIndex];
    this.screenContainerNode.appendChild(screen.createUI());
    screen.start();
};
/**
Prepare data for export (CSV).
* Column 1: ScreenIndex
* Column 2: Class
* Column 3: Questions
* Column 4: Answer options
* Column 5: Answers

@return {string}
*/
ScreenController.prototype.requestDataCSV = function() {
    TheFragebogen.logger.info(this.constructor.name + ".requestDataCSV()", "called.");
    var dataArray = this.requestDataArray();

    var result = "";
    for (var i = 0; i < dataArray.length; i++) {
        result += '"' + dataArray[i][0]; //Screen index
        result += '","' + dataArray[i][1]; //Type of question
        result += '","' + dataArray[i][2]; //Question
        result += '","' + dataArray[i][3]; //Answer options
        result += '","' + dataArray[i][4] + '"\n'; //Answer
    }
    return result;
};
/**
Prepare data for export as a two-dimensional array:
* Column 1: ScreenIndex
* Column 2: Class
* Column 3: Questions
* Column 4: Answer options
* Column 5: Answers

@return {array}
*/
ScreenController.prototype.requestDataArray = function() {
    TheFragebogen.logger.info(this.constructor.name + ".requestDataArray()", "called.");

    var screenIndeces = ["Screen index"];
    var questionType = ["Type of item"];
    var questions = ["Question"];
    var options = ["Answer options"];
    var answers = ["Answer"];

    for (var i = 0; i <= this.currentScreenIndex; i++) {
        var currentData = this.screen[i].getDataCSV();

        if (currentData instanceof Array && currentData[0] instanceof Array && currentData[1] instanceof Array && currentData[2] instanceof Array && currentData[3] instanceof Array) {
            if (currentData[0].length === 0) continue;

            if (currentData[1].length > currentData[3].length) {
                TheFragebogen.logger.warn(this.constructor.name + ".requestDataArray()", "More items than answers - filling with null.");
                currentData[1][currentData[0].length] = null;
            }

            for (var j = 0; j < currentData[0].length; j++) {
                screenIndeces = screenIndeces.concat(i);
            }

            questionType = questionType.concat(currentData[0]);
            questions = questions.concat(currentData[1]);
            options = options.concat(currentData[2]);
            answers = answers.concat(currentData[3]);
        }
    }

    var result = [];
    for (var i in screenIndeces) {
        result[i] = [];
        result[i][0] = screenIndeces[i];
        result[i][1] = questionType[i];
        result[i][2] = questions[i];
        result[i][3] = options[i];
        result[i][4] = answers[i];
    }

    //Replace line breaks.
    result = result.map(function(y) {
        return y.map(function(x) {
            return (typeof x === "string") ? x.replace(/\n/g, '\\n') : x
        })
    });
    return result;
};
/**
@return {boolean}
*/
ScreenController.prototype.isLastScreen = function() {
    return ! (this.currentScreenIndex < this.screen.length - 1);
};
/*
@return {number}
*/
ScreenController.prototype.getCurrentScreenIndex = function() {
    return this.currentScreenIndex;
};
/*
@return {Screen}
*/
ScreenController.prototype.getCurrentScreen = function() {
    return this.screen[this.getCurrentScreenIndex()];
};
/**
Go to screen by screenId.
@argument {number} screenId The id of the screen that should be displayed.
@return {boolean} Success.
*/
ScreenController.prototype.goToScreen = function(screenId) {
    this.screenContainerNode.setAttribute("class", "screenContainer");
    if (this.screenContainerNode === null) {
        TheFragebogen.logger.error(this.constructor.name + ".goToScreen()", "Please call init() before.");
        return false;
    }

    if (! (0 <= screenId && screenId < this.screen.length)) {
        TheFragebogen.logger.error(this.constructor.name + ".goToScreen()", "There is not screen with id: " + screenId);
        return false;
    }

    this.screen[this.currentScreenIndex].releaseUI();
    this.screenContainerNode.innerHTML = null;

    this.currentScreenIndex = screenId;
    this._displayUI();
    return true;
};

/**
Abstract controller class for generic UI elements.
Only provides a set of API that must be implemented by childs.

@abstract
@class UIElement
*/
function UIElement() {
    this.uiCreated = false;
    this.enabled = false;
    this.visible = true;
    
    this.onPreloadedCallback = null;
}
UIElement.prototype.constructor = UIElement;
/**
@returns {boolean} true if the UI is created, false if not
*/
UIElement.prototype.isUIcreated = function() {
    return this.uiCreated;
};
/**
Creates the UI of the element.
@return {object}
@abstract
*/
UIElement.prototype.createUI = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".createUI()", "This method must be overridden.");
};
/**
Destroys the UI.
@abstract
*/
UIElement.prototype.releaseUI = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".releaseUI()", "This method might need to be overridden.");
};
/**
Returns data stored by the object.
@return {object}
@abstract
*/
UIElement.prototype.getData = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".getData()", "This method might need to be overridden.");
};
/**
Evaluates if the newData is valid for this object.
@param {} [newData]
@abstract
*/
UIElement.prototype._checkData = function(newData) {
    TheFragebogen.logger.debug(this.constructor.name + "._checkData()", "This method might need to be overridden.");
};
/**
Sets the provided data.
A check using `_checkData(newData)` must be conducted.
@param {} [newData] 
@abstract
*/
UIElement.prototype.setData = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".setData()", "This method might need to be overridden.");
};
/**
@return {boolean} Is the UI of this element enabled?
@abstract
*/
UIElement.prototype.isEnabled = function() {
    return this.enabled;
};
/**
Set UI enabled state.
@abstract
@param {boolean} enabled
*/
UIElement.prototype.setEnabled = function(enabled) {
    TheFragebogen.logger.warn(this.constructor.name + ".setEnabled()", "This method must be overridden.");
};
/**
@return {boolean} Is the UI of this element visible?
@abstract
*/
UIElement.prototype.isVisible = function() {
    return this.visible;
};
/**
Set UI visible state.
@abstract
*/
UIElement.prototype.setVisible = function() {
    TheFragebogen.logger.warn(this.constructor.name + ".setVisible()", "This method must be overridden.");
};
/**
@returns {string} The type of this class usually the name of the class.
*/
UIElement.prototype.getType = function() {
    return this.constructor.name;
};
/**
@abstract
@return {boolean} Is the element ready?
*/
UIElement.prototype.isReady = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".isReady()", "This method might need to be overridden.");
    return true;
};
/**
Set callback to get informed when loading of all required external data is finished.
@param {Function}
@return {boolean}
*/
UIElement.prototype.setOnPreloadedCallback = function(onPreloadedCallback) {
    if (! (onPreloadedCallback instanceof Function)) {
        TheFragebogen.logger.error(this.constructor.name + ".setOnPreloadedCallback()", "No callback handle given.");
        return false;
    }

    TheFragebogen.logger.debug(this.constructor.name + ".setOnPreloadedCallback()", "called");
    this.onPreloadedCallback = onPreloadedCallback;
    return true;
};
/**
Sends this.onPreloadCallback() to signalize that all required data could be loaded.
@return {boolean}
*/
UIElement.prototype._sendOnPreloadedCallback = function() {
    if (! (this.onPreloadedCallback instanceof Function)) {
        TheFragebogen.logger.warn(this.constructor.name + "._sendOnPreloadedCallback()", "called, but no onScreenPreloadedCallback set.");
        return false;
    }
    this.onPreloadedCallback.apply(this, arguments);
};
/**
@return {string} Returns a string representation of this object.
@abstract
*/
UIElement.prototype.toString = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".toString()", "This method might need to be overridden.");
};

/**
A UIElement that shows non-interactive UI, i.e., plain HTML.
Provided HTML is encapsulated into a div and div.className is set.

@class UIElementHTML
@augments UIElement

@param {string} [className] CSS class
@param {string} html HTML
*/
function UIElementHTML(className, html) {
    UIElement.call(this);

    this.className = (typeof className === "string" ? className : "");
    this.html = (typeof html === "string" ? html : "");

    TheFragebogen.logger.debug(this.constructor.name + "()", "className as " + this.className + " and html as " + this.html);
}
UIElementHTML.prototype = Object.create(UIElement.prototype);
UIElementHTML.prototype.constructor = UIElementHTML;

UIElementHTML.prototype.createUI = function() {
    this.node = document.createElement("div");
    this.node.className = this.className;
    this.node.innerHTML = this.html;
    //this.node.style.background = "blue";

    return this.node;
};

UIElementHTML.prototype.releaseUI = function() {
    this.node = null;
};

UIElementHTML.prototype.setEnabled = function(enabled) {
    //NOPE
};

/**
Returns the HTML
@returns {array} html data stored in the index 0 of the array
*/
UIElementHTML.prototype.getData = function() {
    return[this.html];
};

UIElementHTML.prototype._checkData = function(data) {
    return data[0] === this.html;
};

UIElementHTML.prototype.setData = function(data) {
    return this._checkData(data);
};

UIElementHTML.prototype.setVisible = function(visible) {
    this.visible = visible;
    this.node.className.hidden = visible ? "" : "hidden";
};

/**
A UIElement that has an interactive UI and thus might not be ready in the beginning but requiring user interaction before its goal is fulfilled.

@abstract
@class UIElementInteractive
@augments UIElement
*/
function UIElementInteractive() {
    UIElement.call(this);
    this.enabled = false;
    this.onReadyStateChanged = null;
}
UIElementInteractive.prototype = Object.create(UIElement.prototype);
UIElementInteractive.prototype.constructor = UIElementInteractive;

UIElementInteractive.prototype.isEnabled = function() {
    return this.enabled;
};

UIElementInteractive.prototype.setEnabled = function(enabled) {
    this.enabled = enabled;
    TheFragebogen.logger.debug(this.constructor.name + ".setEnabled()", "This method might need to be overridden.");
};

UIElementInteractive.prototype.setOnReadyStateChangedCallback = function(onReadyStateChanged) {
    if (onReadyStateChanged instanceof Function) {
        TheFragebogen.logger.debug(this.constructor.name + ".setOnReadyStateChangedCallback()", "called");
        this.onReadyStateChanged = onReadyStateChanged;
    }
};

UIElementInteractive.prototype._sendReadyStateChanged = function() {
    if (this.onReadyStateChanged instanceof Function) {
        // REMOVED LOG
		// TheFragebogen.logger.debug(this.constructor.name + "._sendReadyStateChanged()", "called");
        this.onReadyStateChanged(this);
    }
};

/**
Updates the UI to inform to reflect that this element is _yet_ not ready.
@abstract
*/
UIElementInteractive.prototype.markRequired = function() {
    TheFragebogen.logger.debug(this.constructor.name + ".markRequired()", "This method should be overridden.");
};

/**
A QuestionnaireItem is an abstract UIElementInteractive that consists of a question and presents a scale.
The answer on the scale is stored.

NOTE: An QuestionnaireItem that is not yet answered but required, will be marked on check with the CSS class: `className + "Required"`.

DEVERLOPER: Subclasses need to override `_createAnswerNode()`.

@abstract
@class QuestionnaireItem
@augments UIElement
@augments UIElementInteractive
@param {string} [className] CSS class
@param {string} question question
@param {boolean} [required=false] Is this QuestionnaireItem required to be answered?
*/
function QuestionnaireItem(className, question, required) {
    UIElementInteractive.call(this);

    this.node = null;

    this.className = className;
    this.question = question;
    this.required = required;
    this.answer = null;

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: className as " + this.className + ", question as " + this.question + " and required as " + this.required);
}
QuestionnaireItem.prototype = Object.create(UIElementInteractive.prototype);
QuestionnaireItem.prototype.constructor = QuestionnaireItem;
/**
Returns the question.
@returns {string} The question.
*/
QuestionnaireItem.prototype.getQuestion = function() {
    return this.question;
};
/**
Returns the answer.
@returns {string} The answer.
*/
QuestionnaireItem.prototype.getAnswer = function() {
    return this.answer;
};
/**
Sets the answer.
DEVELOPER: If the answer is accepted, the method `this._sendReadyStateChanged()` must be called.
@abstract
*/
QuestionnaireItem.prototype.setAnswer = function() {
    this._sendReadyStateChanged();
    TheFragebogen.logger.debug(this.constructor.name + ".setAnswer()", "This method might need to be overridden.");
};
/**
Is this QuestionnaireItem answered?
@returns {boolean}
*/
QuestionnaireItem.prototype.isAnswered = function() {
    return this.answer !== null;
};
/**
Returns the list of predefined options.
@abstract
@returns {array} undefined by default.
*/
QuestionnaireItem.prototype.getAnswerOptions = function() {
    return undefined;
};
/**
Adjust the UI if the answer was changed using `setAnswer()`.
@abstract
*/
QuestionnaireItem.prototype._applyAnswerToUI = function() {
    TheFragebogen.logger.debug(this.constructor.name + "._applyAnswerToUI()", "This method might need to be overridden.");
};
QuestionnaireItem.prototype.setEnabled = function(enable) {
    this.enabled = this.isUIcreated() ? enable : false;

    if (this.node !== null) {
        var elements = this.node.getElementsByTagName("");
        for (var i = 0; i < elements.length; i++) {
            elements[i].disabled = !this.enabled;
        }
    }
};
QuestionnaireItem.prototype.setVisible = function(visible) {
    this.node.style.visibility = visible ? "visible" : "hidden";
};
/**
Is this QuestionnaireItem ready, i.e., answered if required?
@returns {boolean}
*/
QuestionnaireItem.prototype.isReady = function() {
    return this.isRequired() ? this.isAnswered() : true;
};
/**
Is this QuestionnaireItem required to be answered?
@returns {boolean}
*/
QuestionnaireItem.prototype.isRequired = function() {
    return this.required;
};

QuestionnaireItem.prototype.createUI = function() {
    if (this.isUIcreated()) {
        return this.node;
    }

    this.enabled = false;
    this.uiCreated = true;

    this.node = document.createElement("div");
    this.node.className = this.className;

    this.node.appendChild(this._createQuestionNode());
    this.node.appendChild(this._createAnswerNode());

    return this.node;
};
/**
Create the UI showing the question.
@returns {HTMLElement} The div containing the question.
*/
QuestionnaireItem.prototype._createQuestionNode = function() {
    var node = document.createElement("div");
    node.innerHTML = this.question + (this.required ? "" : "");
    return node;
};
/**
Create the UI showing the scale.
@abstract
@returns {HTMLElement} The HTML container with the scale.
*/
QuestionnaireItem.prototype._createAnswerNode = function() {
    TheFragebogen.logger.warn(this.constructor.name + "._createAnswerNode()", "This method might need to be overridden.");
};

QuestionnaireItem.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
};
/**
Mark this element as required if it was not answered (className + "Required").
Is called by the Screen if necessary.
*/
QuestionnaireItem.prototype.markRequired = function() {
    if (this.node === null) return;

    var classNameRequired = this.className + "Required";
    if (!this.isReady()) {
        this.node.classList.add(classNameRequired);
    } else {
        this.node.classList.remove(classNameRequired);
    }
};

/**
A QuestionnaireItem with a HTML5 date selector.

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} [question]
@param {boolean} [required=false]
@param {string} [min] The earliest acceptable date.
@param {string} [max] The lattest acceptable date.
@param {string} [pattern] The pattern an acceptable date needs to fulfill.
*/
function QuestionnaireItemDate(className, question, required, min, max, pattern) {
    QuestionnaireItem.call(this, className, question, required);

    this.min = min;
    this.max = max;
    this.pattern = pattern;

    this.input = null;

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: min as " + this.min + ", max as " + this.max + " and pattern as " + this.pattern);
}
QuestionnaireItemDate.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemDate.prototype.constructor = QuestionnaireItemDate;

QuestionnaireItemDate.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this.input = document.createElement("input");
    this.input.setAttribute("type", "date");
    if (this.input.type !== "date") {
        node.innerHTML = "The HTML5 date feature not available in this browser.";
        TheFragebogen.logger.error(this.constructor.name + "._createAnswerNode()", "The HTML5 date feature not available in this browser.");
        return node;
    }
    this.input.min = this.min;
    this.input.max = this.max;
    this.input.pattern = this.pattern;
    this.input.addEventListener("change", this._handleChange.bind(this));

    node.appendChild(this.input);

    this._applyAnswerToUI();
    return node;
};

QuestionnaireItemDate.prototype._handleChange = function(event) {
    this.answer = this.input.value;
};

QuestionnaireItemDate.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    if (this.isAnswered()) {
        this.input.value = this.getAnswer();
    }
};

QuestionnaireItemDate.prototype.setAnswer = function(answer) {
    this.answer = answer;
    this._applyAnswerToUI();
    this._sendReadyStateChanged();
    return true;
};

QuestionnaireItemDate.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.input = null;
};

QuestionnaireItemDate.prototype.getData = function() {
    return[this.getQuestion(), this.pattern, this.getAnswer()];
};

QuestionnaireItemDate.prototype._checkData = function(data) {
    return (data[0] === this.question) && (data[1] === this.pattern);
};

QuestionnaireItemDate.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[2]);
    return true;
};

/**
QuestionnaireItems that have a predefined set of potential answers.
 
@abstract
@class QuestionnaireItemDefined
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]
 
@param {array} optionList Possible options.
*/
function QuestionnaireItemDefined(className, question, required, optionList) {
    QuestionnaireItem.call(this, className, question, required);

    if (!optionList instanceof Array) {
        TheFragebogen.logger.error(this.constructor.name + "()", "optionList needs to be an Array.");
    }
    this.optionList = optionList;
    this.input = [];

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: optionList as " + this.optionList);
}
QuestionnaireItemDefined.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemDefined.prototype.constructor = QuestionnaireItem;

QuestionnaireItemDefined.prototype.getAnswerOptions = function() {
    return this.optionList;
};

/**
A QuestionnaireItem that has a predefined set of answer and multiple of these can be selected.
A group of checkboxes is used.

@class QuestionnaireItemDefinedMulti

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemDefined

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {array} optionList
*/
function QuestionnaireItemDefinedMulti(className, question, required, optionList) {
    QuestionnaireItemDefined.call(this, className, question, required, optionList);

    this.identifier = Math.random(); //Part of the identifier for the label + checkbox relation.
    this.answer = [];
}
QuestionnaireItemDefinedMulti.prototype = Object.create(QuestionnaireItemDefined.prototype);
QuestionnaireItemDefinedMulti.prototype.constructor = QuestionnaireItemDefinedMulti;

QuestionnaireItemDefinedMulti.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    for (var i = 0; i < this.optionList.length; i++) {
        this.input[i] = document.createElement("input");
        this.input[i].type = "checkbox";
        this.input[i].id = this.identifier + i;
        this.input[i].name = this.identifier;
        this.input[i].value = i;

        this.input[i].addEventListener("change", this._handleChange.bind(this));

        var label = document.createElement("label");
        label.setAttribute("for", this.identifier + i);
        label.innerHTML = this.optionList[i];

        node.appendChild(this.input[i]);
        node.appendChild(label);
    }

    this._applyAnswerToUI();
    return node;
};

QuestionnaireItemDefinedMulti.prototype._handleChange = function(event) {
    this.answer[event.target.value] = event.target.checked;
    this.markRequired();

    TheFragebogen.logger.info(this.constructor.name + "._handleChange()", this.getAnswer() + ".");
};

QuestionnaireItemDefinedMulti.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    for (var i = 0; i < this.answer.length; i++)
    if (this.input[i] !== undefined) {
        this.input[i].checked = this.answer[i] || false;
    }
};

QuestionnaireItemDefinedMulti.prototype.getAnswer = function() {
    //Clone answer
    var result = this.optionList.slice(0);

    //Remove not selected items
    for (var i = 0; i < this.optionList.length; i++) {
        if (!this.answer[i]) {
            result[i] = null;
        }
    }

    return result.filter(function(n) {
        return n !== null;
    });
};
/**
@param {string|array[string]} answer
@returns {boolean}
*/
QuestionnaireItemDefinedMulti.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = [];
        this._applyAnswerToUI();
        return true;
    }

    if (typeof(answer) === "string") {
        answer = [answer];
    }

    if (answer instanceof Array) {
        this.answer = [];

        if (answer.length > this.optionList.length) {
            TheFragebogen.logger.warn(this.constructor.name + ".setAnswer()", "use only an array.")
            return false;
        }

        for (var i = 0; i < answer.length; i++) {
            var optionIndex = this.optionList.indexOf(answer[i]);
            if (optionIndex === -1) {
                TheFragebogen.logger.warn(this.constructor.name + ".setAnswer()", "Option " + answer[i] + " is not available in " + this.optionList + ".");
                this.answer = [];
                return false;
            }
            this.answer[optionIndex] = true;
        }
        this._applyAnswerToUI();
        this._sendReadyStateChanged();
        return true;
    }

    TheFragebogen.logger.warn(this.constructor.name + ".setAnswer()", "Only accepts: string or array[string].");
    return false;
};
QuestionnaireItemDefinedMulti.prototype.isAnswered = function() {
    return this.answer.length > 0;
};

QuestionnaireItemDefinedMulti.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.input = [];
    this.identifier = null;
};

QuestionnaireItemDefinedMulti.prototype.getData = function() {
    return[this.getQuestion(), this.optionList, this.getAnswer()];
};

QuestionnaireItemDefinedMulti.prototype._checkData = function(data) {
    return (data[0] === this.question) && (JSON.stringify(data[1]) === JSON.stringify(this.optionList));
};

QuestionnaireItemDefinedMulti.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[2]);
    return true;
};
/**
QuestionnaireItems that have a predefined set of answer and one of these can be selected.
A group of radiobuttons is used.

@class QuestionnaireItemDefinedOne

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemDefined

@param {string} [className] CSS class
@param {string} questions
@param {boolean} [required=false]
@param {array} optionList
*/
function QuestionnaireItemDefinedOne(className, question, required, options) {
    QuestionnaireItemDefined.call(this, className, question, required, options);

    this.identifier = Math.random(); //Part of the identifier for the label + radiobutton relation.
}
QuestionnaireItemDefinedOne.prototype = Object.create(QuestionnaireItemDefined.prototype);
QuestionnaireItemDefinedOne.prototype.constructor = QuestionnaireItemDefinedOne;

QuestionnaireItemDefinedOne.prototype._createAnswerNode = function() {
    var tableRowLabel = document.createElement('tr');
    var tableRowRadio = document.createElement('tr');

    for (var i = 0; i < this.optionList.length; i++) {
        this.input[i] = document.createElement("input");
        this.input[i].value = i;
        this.input[i].id = this.identifier + i;
        this.input[i].name = this.identifier;
        this.input[i].type = "radio";

        if (this.answer === this.optionList[i]) {
            this.input[i].checked = true;
        }

        this.input[i].addEventListener("change", this._handleChange.bind(this));

        var label = document.createElement("label");
        label.setAttribute("for", this.identifier + i);
        label.innerHTML = this.optionList[i];

        var tdLabel = document.createElement('td');
        tdLabel.appendChild(label);
        tableRowLabel.appendChild(tdLabel);

        var tdRadio = document.createElement('td');
        tdRadio.appendChild(this.input[i]);
        tableRowRadio.appendChild(tdRadio);
    }

    var tableBody = document.createElement('tbody');
    tableBody.appendChild(tableRowLabel);
    tableBody.appendChild(tableRowRadio);

    var table = document.createElement('table');
    table.style.display = "inline"; //CSS
    table.appendChild(tableBody);

    return table;
};

QuestionnaireItemDefinedOne.prototype._handleChange = function(event) {
    this.answer = this.optionList[event.target.value];
    this.markRequired();
    this._sendReadyStateChanged();
    TheFragebogen.logger.info(this.constructor.name + "._handleChange()", this.answer);
};

QuestionnaireItemDefinedOne.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    for (var i = 0; i < this.answer.length; i++)
    if (this.input[i] !== undefined) {
        this.input[i].checked = this.answer[i] || false;
    }
};
/**
@param {string} answer answer
@returns {boolean}
*/
QuestionnaireItemDefinedOne.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        this._applyAnswerToUI();
        return true;
    }

    var answerIndex = this.optionList.indexOf(answer);
    if (answerIndex === -1) {
        TheFragebogen.logger.error(this.constructor.name + ".setAnswer()", "Provided answer is not an option " + answer + ".");
        return false;
    }

    this.answer = this.optionList[answerIndex];
    this._applyAnswerToUI();

    this._sendReadyStateChanged();
    return true;
};

QuestionnaireItemDefinedOne.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.input = [];
    this.identifier = null;
};

QuestionnaireItemDefinedOne.prototype.getData = function() {
    return[this.getQuestion(), this.optionList, this.getAnswer()];
};

QuestionnaireItemDefinedOne.prototype._checkData = function(data) {
    return (data[0] === this.question) && (JSON.stringify(data[1]) === JSON.stringify(this.optionList));
};

QuestionnaireItemDefinedOne.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[2]);
    return true;
};

/**
A QuestionnaireItem that can be used to input number ranges.
Uses the HTML input type="range".

@class QuestionnaireItemDefinedRange

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemDefined

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {int} [min] Minimal acceptable answer.
@param {int} [max] Maximal acceptable answer.
*/
function QuestionnaireItemDefinedRange(className, question, required, min, max) {
    QuestionnaireItemDefined.call(this, className, question, required, [min, max]);

    this.min = min;
    this.max = max;

    this.input = null;
}
QuestionnaireItemDefinedRange.prototype = Object.create(QuestionnaireItemDefined.prototype);
QuestionnaireItemDefinedRange.prototype.constructor = QuestionnaireItemDefinedRange;

QuestionnaireItemDefinedRange.prototype._createAnswerNode = function() {
    var node = document.createElement("div");
    node.className = this.className;

    this.input = document.createElement("input");
    this.input.type = "range";
    this.input.min = this.min;
    this.input.max = this.max;
    this.input.addEventListener("change", this._handleChange.bind(this));

    node.appendChild(this.input);

    this._applyAnswerToUI();
    return node;
};

QuestionnaireItemDefinedRange.prototype._handleChange = function(event) {
    this.answer = this.input.value;
};

QuestionnaireItemDefinedRange.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) return;

    if (this.isAnswered()) this.input.value = this.getAnswer();
};
/**
@param {string} answer
@returns {boolean}
*/
QuestionnaireItemDefinedRange.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        this._applyAnswerToUI();
        return true;
    }

    this.answer = answer;
    this._applyAnswerToUI();
    this._sendReadyStateChanged();
    return true;
};

QuestionnaireItemDefinedRange.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.input = null;
};

QuestionnaireItemDefinedRange.prototype.getData = function() {
    return[this.getQuestion(), [this.min, this.max], this.getAnswer()];
};

QuestionnaireItemDefinedRange.prototype._checkData = function(data) {
    return (data[0] === this.question) && (data[1][0] === this.min) && (data[1][1] === this.max);
};

QuestionnaireItemDefinedRange.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[2]);
    return true;
};

/**
A QuestionnaireItem that has a predefined set of answer and one of these can be selected.
A HTML select-element is used.

@class QuestionnaireItemDefinedSelector

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemDefined

@param {string} [className] CSS class
@param {string} question question
@param {boolean} [required=false]
@param {array} optionList
*/
function QuestionnaireItemDefinedSelector(className, question, required, optionList) {
    QuestionnaireItemDefined.call(this, className, question, required, optionList);
}
QuestionnaireItemDefinedSelector.prototype = Object.create(QuestionnaireItemDefined.prototype);
QuestionnaireItemDefinedSelector.prototype.constructor = QuestionnaireItemDefinedSelector;

QuestionnaireItemDefinedSelector.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this.select = document.createElement("select");
    this.select.addEventListener("change", this._handleChange.bind(this));

    var optionNull = document.createElement("option");
    optionNull.value = "";
    optionNull.disabled = true;
    optionNull.selected = true;
    optionNull.innerHTML = "";
    this.select.appendChild(optionNull);

    for (var i in this.optionList) {
        var option = document.createElement("option");
        option.value = this.optionList[i];
        option.innerHTML = this.optionList[i];
        this.select.appendChild(option);
    }

    node.appendChild(this.select);

    this._applyAnswerToUI();
    return node;
};
QuestionnaireItemDefinedSelector.prototype._handleChange = function(event) {
    this.answer = this.select.value;
};

QuestionnaireItemDefinedSelector.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    if (this.isAnswered()) {
        this.select.value = this.getAnswer();
    }
};

QuestionnaireItemDefinedSelector.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        this._applyAnswerToUI();
        return true;
    }

    var answerIndex = this.optionList.indexOf(answer);
    if (answerIndex === -1) {
        TheFragebogen.logger.error(this.constructor.name + ".setAnswer()", "Provided answer is not an option " + answer + ".");
        return false;
    }

    this.answer = this.optionList[answerIndex];
    this._applyAnswerToUI();

    this._sendReadyStateChanged();
    return true;
};

QuestionnaireItemDefinedSelector.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.input = [];
    this.select = null;
};

QuestionnaireItemDefinedSelector.prototype.getData = function() {
    return[this.getQuestion(), this.optionList, this.getAnswer()];
};

QuestionnaireItemDefinedSelector.prototype._checkData = function(data) {
    return (data[0] === this.question) && (JSON.stringify(data[1]) === JSON.stringify(this.optionList));
};

QuestionnaireItemDefinedSelector.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[2]);
    return true;
};
/**
A QuestionnaireItemMedia is the base class for QuestionnaireItems that present media, e.g., image, audio, or video.

Playable media start playing automatically if loaded (canplaythrough=true) and `setEnabled(true)`.

@abstract
@class QuestionnaireItemMedia
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} [question]
@param {boolean} [required=false]
@param {string} url The URL of the media element to be loaded; if supported by the browser also data URI.
@param {boolean} required Element must report ready before continue.
@param {boolean} [readyOnError=true] Sets ready=true if an error occures.
*/
function QuestionnaireItemMedia(className, question, required, url, readyOnError) {
    QuestionnaireItem.call(this, className, question, required);

    this.url = url;
    this.isContentLoaded = false;
    this.stallingCount = 0;
    this.wasSuccessfullyPlayed = false;
    this.readyOnError = (typeof readyOnError === "boolean" ? readyOnError : true);

    this.errorOccured = false;
}
QuestionnaireItemMedia.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemMedia.prototype.constructor = QuestionnaireItemMedia;
QuestionnaireItemMedia.prototype.load = function() {
    TheFragebogen.logger.info(this.constructor.name + ".load()", "Start loading for " + this.getURL() + ".");
};

QuestionnaireItemMedia.prototype.isLoaded = function() {
    return this.isContentLoaded;
};

QuestionnaireItemMedia.prototype.isReady = function() {
    if (!this.readyOnError && this.errorOccured) {
        return false;
    }

    return this.isRequired() ? this.wasSuccessfullyPlayed : true;
};

QuestionnaireItemMedia.prototype.getURL = function() {
    return this.url;
};

QuestionnaireItemMedia.prototype.getStallingCount = function() {
    return this.stallingCount;
};

QuestionnaireItemMedia.prototype.setEnabled = function(enabled) {
    if (!this.isUIcreated()) {
        TheFragebogen.logger.warn(this.constructor.name + ".setEnabled()", "Cannot start playback on setEnabled without createUI().");
        return;
    }
    this.enabled = enabled;

    if (enabled) {
        this._play();
    } else {
        this._pause();
    }
};

QuestionnaireItemMedia.prototype.preload = function(callback) {
    TheFragebogen.logger.debug(this.constructor.name + ".preload()", "Start preloading.");
    this.setOnElementPreloadedCallback(callback);

    this._loadMedia();
};

QuestionnaireItemMedia.prototype._loadMedia = function() {
    TheFragebogen.logger.warn(this.constructor.name + "._loadMedia()", "This method must be overridden for correct preloading.");
};

//Media-related callbacks
/**
Start playback of playable media.
*/
QuestionnaireItemMedia.prototype._play = function() {
    TheFragebogen.logger.debug(this.constructor.name + "._play()", "This method must be overridden if playback is desired.");
};
/**
Pause playback of playable media.
*/
QuestionnaireItemMedia.prototype._pause = function() {
    TheFragebogen.logger.debug(this.constructor.name + "._pause()", "This method must be overridden if playback is desired.");
};

QuestionnaireItemMedia.prototype._onloading = function() {
    TheFragebogen.logger.info(this.constructor.name + "._onloading()", "This method might be overriden.");
};

QuestionnaireItemMedia.prototype._onloaded = function() {
    TheFragebogen.logger.info(this.constructor.name + "._onloaded()", "Loading done for " + this.getURL() + ".");

    this.isContentLoaded = true;
    this._sendOnPreloadedCallback(this, true);

    this.setEnabled(this.enabled); //Autostart playback?
};

QuestionnaireItemMedia.prototype._onstalled = function() {
    this.stallingCount += 1;
    this._sendOnPreloadedCallback(this, false);

    TheFragebogen.logger.warn(this.constructor.name + "._onstalled()", "Stalling occured (" + this.stallingCount + ") for " + this.getURL());
};

QuestionnaireItemMedia.prototype._onerror = function() {
    this.stallingCount += 1;
    this._sendOnPreloadedCallback(this, false);

    TheFragebogen.logger.error(this.constructor.name + "._onerror()", "Stalling occured (" + this.stallingCount + ") for " + this.getURL());
};

QuestionnaireItemMedia.prototype._onprogress = function() {
    TheFragebogen.logger.debug(this.constructor.name + "._onprogress()", "This method must be overridden if progress reporting is desired.");
};

QuestionnaireItemMedia.prototype._onended = function() {
    TheFragebogen.logger.info(this.constructor.name + "._onended", "Playback finished.");

    this.wasSuccessfullyPlayed = true;
    this.setAnswer(this.getData());

    this._sendReadyStateChanged();
    this.markRequired();
};

QuestionnaireItemMedia.prototype.setAnswer = function(answer) {
    this.answer == answer;
};

QuestionnaireItemMedia.prototype.getData = function() {
    return[this.url, this.time];
};

QuestionnaireItemMedia.prototype._checkData = function(data) {
    return (data[0] === this.getURL()) && (data[1] === this.getStallingCount());
};

QuestionnaireItemMedia.prototype.setData = function(data) {
    return this._checkData(data);
};

/**
A QuestionnaireItemMedia that plays an audio file.
NOTE: Useful to capture failure to loads.

@class QuestionnaireItemMediaAudio
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemMedia

@param {string} [className] CSS class
@param {string} [question]
@param {boolean} [required=false]
@param {string} url The URL of the media element to be loaded; if supported by the browser also data URI.
@param {boolean} required Element must report ready before continue.
@param {boolean} [readyOnError=true] Sets ready=true if an error occures.
*/
function QuestionnaireItemMediaAudio(className, question, required, url, readyOnError) {
    QuestionnaireItemMedia.call(this, className, question, required, url, readyOnError);

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: className as " + this.className + ", urls as " + this.height + ", width as " + this.width);

    this.audioNode = null;
    this.progressbar = null;
}
QuestionnaireItemMediaAudio.prototype = Object.create(QuestionnaireItemMedia.prototype);
QuestionnaireItemMediaAudio.prototype.constructor = QuestionnaireItemMediaAudio;

QuestionnaireItemMediaAudio.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this._createMediaNode();

    this.progressbar = document.createElement("progress");
    node.appendChild(this.progressbar);

    node.appendChild(this.audioNode);

    this.audioNode.ontimeupdate = this._onprogress.bind(this);
    this.audioNode.onerror = this._onerror.bind(this);
    this.audioNode.onended = this._onended.bind(this);

    return node;
};

QuestionnaireItemMediaAudio.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.audioNode = null;
    this.progressbar = null;
};

QuestionnaireItemMediaAudio.prototype._loadMedia = function() {
    this._createMediaNode();
};

QuestionnaireItemMediaAudio.prototype._createMediaNode = function() {
    if (this.audioNode !== null) {
        TheFragebogen.logger.debug(this.constructor.name + "()", "audioNode was already created.");
        return;
    }

    this.audioNode = new Audio();
    this.audioNode.onload = this._onloaded.bind(this);
    this.audioNode.src = this.url;
};

QuestionnaireItemMediaAudio.prototype._play = function() {
    if (this.audioNode === null) {
        TheFragebogen.logger.warn(this.constructor.name + "()", "Cannot start playback without this.audioNode.");
        return;
    }
    this.audioNode.play();
};

QuestionnaireItemMediaAudio.prototype._pause = function() {
    if (this.audioNode === null) {
        TheFragebogen.logger.warn(this.constructor.name + "()", "Cannot start playback without this.audioNode.");
        return;
    }
    this.audioNode.pause();
};

QuestionnaireItemMedia.prototype._onprogress = function() {
    if (this.progressbar && !isNaN(this.audioNode.duration)) {
        this.progressbar.value = (this.audioNode.currentTime / this.audioNode.duration);
    }
};

/**
A QuestionnaireItemMedia that displays an image.
NOTE: Useful to capture failure to loads.

@class QuestionnaireItemMediaImage
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemMedia

@param {string} [className] CSS class
@param {string} [question]
@param {boolean} [required=false]
@param {string} url The URL of the media element to be loaded; if supported by the browser also data URI.
@param {boolean} required Element must report ready before continue.
@param {boolean} [readyOnError=true] Sets ready=true if an error occures.
*/
function QuestionnaireItemMediaImage(className, question, required, url, readyOnError) {
    QuestionnaireItemMedia.call(this, className, question, required, url, readyOnError);

    TheFragebogen.logger.debug("QuestionnaireItemMediaImage()", "Set: className as " + this.className + ", height as " + this.height + ", width as " + this.width);

    this.imageNode = null;
}
QuestionnaireItemMediaImage.prototype = Object.create(QuestionnaireItemMedia.prototype);
QuestionnaireItemMediaImage.prototype.constructor = QuestionnaireItemMediaImage;

QuestionnaireItemMediaImage.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this._createMediaNode();

    node.appendChild(this.imageNode);

    return node;
};

QuestionnaireItemMediaImage.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.imageNode = null;
};

QuestionnaireItemMediaImage.prototype._loadMedia = function() {
    this._createMediaNode();
};

QuestionnaireItemMediaImage.prototype._createMediaNode = function() {
    if (this.imageNode !== null) {
        TheFragebogen.logger.debug("QuestionnaireItemMediaImage()", "Images was already created.");
        return;
    }

    this.imageNode = new Image();
    this.imageNode.onload = this._onloaded.bind(this);
    this.imageNode.src = this.url;
};

/**
A QuestionnaireItemMedia that plays a video.
NOTE: Useful to capture failure to loads.

@class QuestionnaireItemMediaVideo
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemMedia

@param {string} [className] CSS class
@param {string} [question]
@param {boolean} [required=false]
@param {string} url The URL of the media element to be loaded; if supported by the browser also data URI.
@param {boolean} required Element must report ready before continue.
@param {boolean} [readyOnError=true] Sets ready=true if an error occures.
*/
function QuestionnaireItemMediaVideo(className, question, required, url, readyOnError) {
    QuestionnaireItemMedia.call(this, className, question, required, url, readyOnError);

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: className as " + this.className + ", urls as " + this.height + ", width as " + this.width);

    this.videoNode = null;
}
QuestionnaireItemMediaVideo.prototype = Object.create(QuestionnaireItemMedia.prototype);
QuestionnaireItemMediaVideo.prototype.constructor = QuestionnaireItemMediaVideo;

QuestionnaireItemMediaVideo.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this._createMediaNode();

    node.appendChild(this.videoNode);

    this.videoNode.ontimeupdate = this._onprogress.bind(this);
    this.videoNode.onerror = this._onerror.bind(this);
    this.videoNode.onended = this._onended.bind(this);

    return node;
};

QuestionnaireItemMediaVideo.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.videoNode = null;
};

QuestionnaireItemMediaVideo.prototype._loadMedia = function() {
    this._createMediaNode();
};

QuestionnaireItemMediaVideo.prototype._createMediaNode = function() {
    if (this.videoNode !== null) {
        TheFragebogen.logger.debug(this.constructor.name + "()", "audioNode was already created.");
        return;
    }

    this.videoNode =  document.createElement('video');
    this.videoNode.onload = this._onloaded.bind(this);
    this.videoNode.src = this.url;
};

QuestionnaireItemMediaVideo.prototype._play = function() {
    if (this.videoNode === null) {
        TheFragebogen.logger.warn(this.constructor.name + "()", "Cannot start playback without this.videoNode.");
        return;
    }
    this.videoNode.play();
};

QuestionnaireItemMediaVideo.prototype._pause = function() {
    if (this.videoNode === null) {
        TheFragebogen.logger.warn(this.constructor.name + "()", "Cannot start playback without this.videoNode.");
        return;
    }
    this.videoNode.pause();
};

QuestionnaireItemMedia.prototype._onprogress = function() {
    //Nope
};

/**
A base class for QuestionnaireItems using a SVG as scale.

The SVG is required to have click-positions representing the potential answers (e.g., path, rect, ellipse).
Actionlistener are added to these while the id of each answer-element represents the _answer_.
In addition, the SVG must contain an element `id="cross"` that shows the current answer (if set).

DEVELOPER:
To implement a new scale:
1. Create an SVG
1.1. Add a id=cross
1.2. Add click-position with _unique_ id (Non-unique ids also work, but setAnswer() will misbehave).
2. Override _setupSVG(): Set up the SVG and viewbox.
3. Override _getAnswerElements()
4. Override getAnswerOptions

ATTENTION:
Creating the SVG is not straight forward as the cross-element is moved to an answer using transform.
We had some trouble, if each answer-element had an individual transform (e.g., matrix) instead of an absolute position.

[Inkscape](http://inkscape.org) might add those transform if copy-and-paste is used.
To remove those transforms group and ungroup all answer-elements in Inkscape.

To test your SVG, you can use the following code (open the SVG in Chrome and open developer mode).
The cross should be positioned accordingly.

<code>
var cross=document.getElementById("cross")
var answerA = document.getElementById('10'); //Change if you use different answer

cross.setAttributeNS(null, "transform", "translate(0,0)"); //Reset cross position

transform = cross.getTransformToElement(answerA)
crossBB = cross.getBBox()
answerABB = answerA.getBBox()
cross.setAttributeNS(null, "transform", "translate(" + (-transform.e + Math.abs(answerABB.x - crossBB.x) - crossBB.width/2 + answerABB.width/2) + ",0)");
</code>

@class QuestionnaireItemSVG
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
 
@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]
*/
function QuestionnaireItemSVG(className, question, required) {
    QuestionnaireItem.call(this, className, question, required);

    this.scaleImage = null;
    this.answerMap = null;
    this.crossImage = null;
}
QuestionnaireItemSVG.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemSVG.prototype.constructor = QuestionnaireItemSVG;

QuestionnaireItemSVG.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    node.className = this.className;

    this.scaleImage = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._setupSVG();

    this.crossImage = this.scaleImage.getElementById("cross");
    //Problem identified here by the tests while using Safari 7.0.6 --- this.crossImage === null
    if (this.crossImage === null) {
        node.innerHTML = '"QuestionnaireItemSVG" feature not available in this browser or SVG is not compatible.'
        this.answer = "unavailable"; //sets answer, so the item will be ready even if it was required.
        return node;
    }

    this.crossImage.setAttributeNS(null, "opacity", 0);

    //Attach event listener to clickable areas.
    this.answerMap = {};
    var answerElements = this._getAnswerElements();

    for (var i = 0; i < answerElements.length; i++) {
        if (answerElements[i].id === "cross") {
            continue;
        }

        this.answerMap[answerElements[i].id] = answerElements[i];
        answerElements[i].onclick = (this._handleChange).bind(this);
    }

    if (this.answer !== null) {
        this._updateUI();
    }

    node.appendChild(this.scaleImage);
    return node;
};
/**
Setup this.scaleImage by definining the content and the viewbox.
1. this.scaleImage.innerHTML = "<svg...>";
2. this.scaleImage.setAttribute("viewBox", "0 2 136.76 21.39");
*/
QuestionnaireItemSVG.prototype._setupSVG = function() {
    TheFragebogen.logger.error(this.constructor.name + "._setupSVG()", "Must be overridden.");
};
/**
Returns all clickable elements representing an answer.
Every element must have a unique id, which is used as answer.
@returns {array}
*/
QuestionnaireItemSVG.prototype._getAnswerElements = function() {
    TheFragebogen.logger.error(this.constructor.name + "._answerElements()", "Must be overridden.");
    return[];
};

QuestionnaireItemSVG.prototype._handleChange = function(event) {
    if (!this.isEnabled()) {
        return;
    }

    this.setAnswer(event.target.id);

    this.markRequired();
    this._sendReadyStateChanged();
};
QuestionnaireItemSVG.prototype._updateUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    if (this.answer === null) {
        this.crossImage.setAttributeNS(null, "opacity", 0);
        return;
    }
    if (this.answerMap[this.getAnswer()] === undefined) {
        TheFragebogen.logger.error(this.constructor.name + "._updateUI()", "Invalid answer provided: " + this.getAnswer());
        return false;
    }

    //Displays cross
    this.crossImage.setAttributeNS(null, "opacity", 1);

    //Reset previous transforms.
    this.crossImage.setAttributeNS(null, "transform", "translate(0,0)");

    //Move to new position.
    var answer = this.answerMap[this.answer];
    var crossBBox = this.crossImage.getBBox();
    var answerBBox = answer.getBBox();

    var transform = answer.getScreenCTM().inverse().multiply(this.crossImage.getScreenCTM());
    var translateX = -transform.e + Math.abs(answerBBox.x - crossBBox.x) - crossBBox.width / 2 + answerBBox.width / 2;

	// REMOVED LOG
    // TheFragebogen.logger.debug(this.constructor.name + "._updateUI()", translateX);
    this.crossImage.setAttributeNS(null, "transform", "translate(" + translateX + ",0)");
};

QuestionnaireItemSVG.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        this._updateUI();
        return true;
    }

    TheFragebogen.logger.info(this.constructor.name + ".setAnswer()", answer);
    this.answer = answer;

    this.markRequired();
    this._sendReadyStateChanged();

    this._updateUI();
    return true;
};

QuestionnaireItemSVG.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.scaleImage = null;
    this.answerMap = null;
    this.crossImage = null;
};

QuestionnaireItemSVG.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};

QuestionnaireItemSVG.prototype._checkData = function(data) {
    return data[0] === this.question;
};

QuestionnaireItemSVG.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[1]);
    return true;
};

QuestionnaireItemSVG.prototype.getAnswerOptions = function() {
    TheFragebogen.logger.warn(this.constructor.name + ".getAnswerOptions()", "Should be overriden.");
};

/**
A QuestionnaireItem presenting a 5 point continuous scale

@class QuestionnaireItemContinuous5pt
 
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {string} [caption10] The caption of the 1st label.
@param {string} [caption20] The caption of the 2nd label.
@param {string} [caption30] The caption of the 3rd label.
@param {string} [caption40] The caption of the 4th label.
@param {string} [caption50] The caption of the 5th label.
*/
function QuestionnaireItemContinuous5pt(className, question, required, caption10, caption20, caption30, caption40, caption50) {
    QuestionnaireItemSVG.call(this, className, question, required);

	if (arguments.length < 4)
	{
		this.caption10 = "immer";
		this.caption20 = "oft";
		this.caption30 = "gelegentlich";
		this.caption40 = "selten";
		this.caption50 = "nie";
	}else{
		this.caption10 = caption10;
		this.caption20 = caption20;
		this.caption30 = caption30;
		this.caption40 = caption40;
		this.caption50 = caption50;
	}
}
QuestionnaireItemContinuous5pt.prototype = Object.create(QuestionnaireItemSVG.prototype);
QuestionnaireItemContinuous5pt.prototype.constructor = QuestionnaireItemContinuous5pt;
QuestionnaireItemContinuous5pt.prototype._setupSVG = function() {
    this.scaleImage = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.scaleImage.setAttribute("viewBox", "0 2 136.76 21.39");
    this.scaleImage.innerHTML = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   width="136.76094"   height="21.394005"   id="svg5198"   version="1.1"   inkscape:version="0.91 r13725"   sodipodi:docname="quality5pt_scale.svg">  <defs     id="defs5200" />  <metadata     id="metadata5203">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <g     id="layer1"     transform="translate(-12.104855,-1030.0402)"     style="display:inline">    <rect       style="fill:#000000;fill-opacity:1"       id="rect5206"       width="103"       height="1"       x="30"       y="1036.3621" />    <rect       style="opacity:0;fill:#000000;fill-opacity:1"       id="rect5763"       width="1.000026"       height="2.0999999"       x="25"       y="1037.2622" />    <rect       style="opacity:0;fill:#000000;fill-opacity:1"       id="rect5765"       width="1.000026"       height="2.0999999"       x="29.000103"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9"       width="1.000026"       height="2.0999999"       x="122.37486"       y="1037.1372" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9-9"       width="1.000026"       height="2.0999999"       x="38.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9-4-2"       width="1"       height="2.0999999"       x="44.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5822-6"       width="1.2"       height="5"       x="50.799854"       y="1037.3622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5763-5-2"       width="1.000026"       height="2.0999999"       x="56.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-7-5"       width="1.000026"       height="2.0999999"       x="62.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9-9-0"       width="1.000026"       height="2.0999999"       x="68.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9-4-2-3"       width="1"       height="2.0999999"       x="74.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5822-6-5"       width="1.2"       height="5"       x="80.800003"       y="1037.3622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5763-5-2-9"       width="1.000026"       height="2.0999999"       x="86.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-7-5-9"       width="1.000026"       height="2.0999999"       x="92.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9-9-0-0"       width="1.000026"       height="2.0999999"       x="98.999855"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5765-9-4-2-3-5"       width="1"       height="2.0999999"       x="104.99986"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect5822-6-5-4"       width="1.2"       height="5"       x="110.79986"       y="1037.3622" />    <rect       style="opacity:0;fill:#000000;fill-opacity:1"       id="rect5765-9-9-0-0-8-0"       width="1.000026"       height="2.0999999"       x="133.00023"       y="1037.2622" />    <rect       style="opacity:0;fill:#000000;fill-opacity:1"       id="rect5765-9-4-2-3-5-0-5"       width="1"       height="2.0999999"       x="136.99986"       y="1037.2622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect6036"       width="8.8000002"       height="0.40000001"       x="21.204855"       y="1036.6622" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect6036-5"       width="0.3491767"       height="5.4000001"       x="21.206226"       y="1036.9623" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect6036-2"       width="8.8000002"       height="0.40000001"       x="-141.80486"       y="1036.6621"       transform="scale(-1,1)" />    <rect       style="fill:#000000;fill-opacity:1"       id="rect6036-5-2"       width="0.40000001"       height="5.4000001"       x="-141.80486"       y="1036.9622"       transform="scale(-1,1)" />    <text       id="label10"     xml:space="preserve"       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"       x="21.174231"       y="1044.5059"       id="label20"       sodipodi:linespacing="100%"       inkscape:label=""><tspan         sodipodi:role="line"         id="tspan3851-5"         x="21.174231"         y="1042.5059" /><tspan         sodipodi:role="line"         x="21.174231"         y="1044.5059"         id="tspan3853-8">immer</tspan></text>    <text       id="label20"       xml:space="preserve"       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"       x="51.267605"       y="1044.6182"       id="label30"       sodipodi:linespacing="100%"       inkscape:label=""><tspan         sodipodi:role="line"         id="tspan3851-5-5"         x="51.267605"         y="1042.6182" /><tspan         sodipodi:role="line"         x="51.267605"         y="1044.6182"         id="tspan3853-8-1">oft</tspan></text>    <text       id="label30"       xml:space="preserve"       style="font-size:2px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:center;line-height:100%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none;display:inline;font-family:Sans;-inkscape-font-specification:Sans"       x="81.267944"       y="1044.6058"       id="label40"       sodipodi:linespacing="100%"       inkscape:label=""><tspan         sodipodi:role="line"         id="tspan3851-5-5-2"         x="81.267944"         y="1042.6058" /><tspan         sodipodi:role="line"         x="81.267944"         y="1044.6058"         id="tspan3853-8-1-6">gelegentlich</tspan></text>    <text       id="label40"       xml:space="preserve"       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"       x="111.46878"       y="1044.4182"       id="label50"       sodipodi:linespacing="100%"       inkscape:label=""><tspan         sodipodi:role="line"         id="tspan3851-5-5-2-6"         x="111.46878"         y="1042.4182" /><tspan         sodipodi:role="line"         x="111.46878"         y="1044.4182"         id="tspan3853-8-1-6-0">selten</tspan></text>    <text       id="label50"       xml:space="preserve"       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"       x="141.44997"       y="1044.5182"       id="label60"       sodipodi:linespacing="100%"       inkscape:label=""       inkscape:transform-center-x="0.81249996"       inkscape:transform-center-y="2.0624999"><tspan         sodipodi:role="line"         id="tspan3851-5-5-2-1"         x="141.44997"         y="1042.5182" /><tspan         sodipodi:role="line"         x="141.44997"         y="1044.5182"         id="tspan3853-8-1-6-04">nie</tspan></text>    <rect       style="display:inline;fill:#000000;fill-opacity:1"       id="rect5765-9-4"       width="1.000026"       height="2.0999999"       x="116.72986"       y="1037.2592" />  </g>  <g     inkscape:groupmode="layer"     id="layer3"     inkscape:label="ClickPosition"     transform="translate(7.8951471,6.3219508)"     style="display:inline">    																																									<ellipse       ry="2.5"       rx="0.50000000"       cy="1.5720948"       cx="1.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="10"       inkscape:label="" /> <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="4.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="11"       inkscape:label="" /> <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="7.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="12"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="10.4048547"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="13"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="13.4048542"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="14"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="16.404855"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="15"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="19.304855"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="16"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="22.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="17"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="25.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="18"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="28.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="19"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.50000000"       cy="1.5720948"       cx="31.404856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="20"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="34.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="21"       inkscape:label="" />  <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="37.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="22"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="40.504854"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="23"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="43.504854"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="24"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="46.504854"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="25"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="49.504852"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="26"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="52.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="27"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="55.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="28"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="58.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="29"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.50000000"       cy="1.5720948"       cx="61.404854"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="30"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="64.354855"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="31"       inkscape:label="" />   <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="67.454853"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="32"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="70.504852"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="33"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="73.504852"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="34"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="76.504852"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="35"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="79.504852"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="36"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="82.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="37"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="85.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="38"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="88.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="39"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.50000000"       cy="1.5720948"       cx="91.404850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="40"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="94.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="41"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="97.304850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="42"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="100.304850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="43"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="102.804850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="44"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="106.104850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="45"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="109.104850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="46"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="112.304850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="47"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="115.304850"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="48"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.94999999"       cy="1.5720948"       cx="118.804856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="49"       inkscape:label="" />    <ellipse       ry="2.5"       rx="0.50000000"       cy="1.5720948"       cx="121.504856"       style="opacity:0;fill:#000000;fill-opacity:0.45871558"       id="50"       inkscape:label="" />    </g>  <g     id="layer4"     style="display:inline"     transform="translate(7.0000016,5.4565456)">    <path       style="fill:none;stroke:#000000;stroke-width:0.60000002;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"       d="M 3.666497,-0.09404561 C 0.69774682,2.8434544 0.69774682,2.8434544 0.69774682,2.8434544 L 2.2289971,1.3747044 0.72899682,-0.15654561 3.697747,2.8434544"       id="cross" /> </g></svg>';
	// added to change attributes
	this.scaleImage.getElementById("label10").textContent = this.caption10;
	this.scaleImage.getElementById("label20").textContent = this.caption20;
	this.scaleImage.getElementById("label30").textContent = this.caption30;
	this.scaleImage.getElementById("label40").textContent = this.caption40;
	this.scaleImage.getElementById("label50").textContent = this.caption50;
};
QuestionnaireItemContinuous5pt.prototype._getAnswerElements = function() {
    return this.scaleImage.getElementsByTagName("ellipse");
};
QuestionnaireItemContinuous5pt.prototype.getAnswerOptions = function() {
    return "10-50";
};

/**
A QuestionnaireItem presenting the NASA Task Load Index, cf. http://humansystems.arc.nasa.gov/groups/tlx/downloads/TLXScale.pdf
See also the manual at http://humansystems.arc.nasa.gov/groups/tlx/downloads/TLX_pappen_manual.pdf

@class QuestionnaireItemNASATLX

@augments QuestionnaireItemSVG
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {string} [captionRight] The caption of the left label.
@param {string} [captionLeft] The caption of the right label.
*/
function QuestionnaireItemNASATLX(className, question, required, captionLeft, captionRight) {
    QuestionnaireItemSVG.call(this, className, question, required);

    this.captionLeft = captionLeft;
    this.captionRight = captionRight;
}
QuestionnaireItemNASATLX.prototype = Object.create(QuestionnaireItemSVG.prototype);
QuestionnaireItemNASATLX.prototype.constructor = QuestionnaireItemNASATLX;
QuestionnaireItemNASATLX.prototype._setupSVG = function() {
    this.scaleImage.setAttribute("viewBox", "0 5 115 20");
    this.scaleImage.innerHTML = '<?xml version="1.0" encoding="utf-8" standalone="no"?><svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="115" height="22.750004" id="svg5198" version="1.1"><defs id="defs5200" /><metadata id="metadata5203"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title /></cc:Work></rdf:RDF></metadata><g style="display:inline" transform="translate(-14.754855,-1027.4342)" id="layer1"><rect y="1041.2622" x="25" height="2.0999999" width="1.000026" id="rect5763" style="opacity:0;fill:#000000;fill-opacity:1" /><rect y="1041.2622" x="29.000103" height="2.0999999" width="1.000026" id="rect5765" style="opacity:0;fill:#000000;fill-opacity:1" /><rect y="1041.2622" x="133.00023" height="2.0999999" width="1.000026" id="rect5765-9-9-0-0-8-0" style="opacity:0;fill:#000000;fill-opacity:1" /><rect y="1041.2622" x="136.99986" height="2.0999999" width="1" id="rect5765-9-4-2-3-5-0-5" style="opacity:0;fill:#000000;fill-opacity:1" /><text transform="translate(12.104855,1032.0442)" id="text4739" y="18.240952" x="6.717514" style="font-style:normal;font-weight:normal;font-size:40px;line-height:125%;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#000000;fill-opacity:1;stroke:none" xml:space="preserve"><tspan y="18.240952" x="6.717514" id="tspan4741" /></text><text id="labelLeft" y="1045.1559" x="30" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none" xml:space="preserve"><tspan style="text-align:start;text-anchor:start" id="tspan3853" y="1045.1559" x="30">left</tspan></text><text id="labelRight" y="1044.7682" x="105" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:start;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;display:inline;fill:#000000;fill-opacity:1;stroke:none" xml:space="preserve"><tspan style="text-align:end;text-anchor:end" id="tspan3853-3" y="1044.7682" x="115">right</tspan></text><path id="path4250" d="m 22.104855,1041.2842 99.999995,0" style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:0.30000001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /><path id="path4252" d="m 22.204855,1041.4342 0,-5" style="fill:none;fill-rule:evenodd;stroke:#000000;stroke-width:0.23783921;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /><use height="100%" width="100%" id="use5759" transform="translate(5,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5761" transform="translate(10,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5763" transform="translate(15,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5765" transform="translate(20,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5767" transform="translate(25,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5769" transform="translate(30,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5771" transform="translate(35,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5773" transform="translate(40,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5775" transform="translate(45,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5777" transform="matrix(1,0,0,1.6,50,-624.86052)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5779" transform="translate(55,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5781" transform="translate(60,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5783" transform="translate(65,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5785" transform="translate(70,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5787" transform="translate(75,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5789" transform="translate(80,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5791" transform="translate(85,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5793" transform="translate(90,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5795" transform="translate(95,0)" xlink:href="#path4252" y="0" x="0" /><use height="100%" width="100%" id="use5797" transform="translate(100,0)" xlink:href="#path4252" y="0" x="0" /></g><g id="layer2" transform="translate(5.2451471,8.9279683)" style="display:inline;opacity:1"><path id="0" d="m 4.7548529,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 9.7548529,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="1" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 14.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5000001,-5 2.5,5 0 0 1 2.5000001,-5 2.5,5 0 0 1 2.5,5 z" id="2" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 19.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="3" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 24.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="4" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 29.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="5" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 34.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="6" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 39.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="7" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 44.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="8" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 49.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="9" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 54.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="10" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 59.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="11" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 64.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="12" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 69.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="13" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 74.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="14" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 79.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="15" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 84.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="16" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 89.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="17" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 94.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="18" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 99.754853,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.5,-5 2.5,5 0 0 1 2.5,-5 2.5,5 0 0 1 2.5,5 z" id="19" /><path style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" d="m 104.75485,1.0720317 a 2.5,5 0 0 1 -2.5,5 2.5,5 0 0 1 -2.499997,-5 2.5,5 0 0 1 2.499997,-5 2.5,5 0 0 1 2.5,5 z" id="20" /></g><g transform="translate(4.3500016,8.0625619)" style="display:inline" id="layer4"><path id="cross" d="m 4.5624981,4.3356463 c -2.9687502,2.9375 -2.9687502,2.9375 -2.9687502,2.9375 l 1.5312503,-1.46875 -1.5000003,-1.53125 2.9687502,3" style="display:inline;fill:none;stroke:#000000;stroke-width:0.60000002;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /></g></svg>';

    this.scaleImage.getElementById("labelLeft").textContent = this.captionLeft;
    this.scaleImage.getElementById("labelRight").textContent = this.captionRight;
};
QuestionnaireItemNASATLX.prototype._getAnswerElements = function() {
    return this.scaleImage.getElementsByTagName("path");
};
QuestionnaireItemNASATLX.prototype.getAnswerOptions = function(data) {
    return "0-57";
};

/**
A QuestionnaireItem presenting the 7pt Quality scale as defined in ITU-T P.851 p. 19.

@class QuestionnaireItemQuality7pt
 
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {string} [caption10] The caption of the 1st label.
@param {string} [caption20] The caption of the 2nd label.
@param {string} [caption30] The caption of the 3rd label.
@param {string} [caption40] The caption of the 4th label.
@param {string} [caption50] The caption of the 5th label.
@param {string} [caption60] The caption of the 6th label.
@param {string} [caption70] The caption of the 7th label.
*/
function QuestionnaireItemQuality7pt(className, question, required, labels) {
    QuestionnaireItemSVG.call(this, className, question, required);

	if (arguments.length < 4)
	{
		this.caption10 = "extremely bad";
		this.caption20 = "bad";
		this.caption30 = "poor";
		this.caption40 = "fair";
		this.caption50 = "good";
		this.caption60 = "excellent";
		this.caption70 = "ideal";
	}else{
		this.caption10 = labels[0];
		this.caption20 = labels[1];
		this.caption30 = labels[2];
		this.caption40 = labels[3];
		this.caption50 = labels[4];
		this.caption60 = labels[5];
		this.caption70 = labels[6];
	}
}
QuestionnaireItemQuality7pt.prototype = Object.create(QuestionnaireItemSVG.prototype);
QuestionnaireItemQuality7pt.prototype.constructor = QuestionnaireItemQuality7pt;
QuestionnaireItemQuality7pt.prototype._setupSVG = function() {
    this.scaleImage = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.scaleImage.setAttribute("viewBox", "0 2 136.76 21.39");
    this.scaleImage.innerHTML = '<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg    xmlns:dc="http://purl.org/dc/elements/1.1/"    xmlns:cc="http://creativecommons.org/ns#"    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"    xmlns:svg="http://www.w3.org/2000/svg"    xmlns="http://www.w3.org/2000/svg"    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"    xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"    version="1.1"    id="svg5198"    height="21.394005"    width="136.76094"    sodipodi:docname="quality7pt_scale.svg"    inkscape:version="0.92.1 r15371">   <sodipodi:namedview      pagecolor="#ffffff"      bordercolor="#666666"      borderopacity="1"      objecttolerance="10"      gridtolerance="10"      guidetolerance="10"      inkscape:pageopacity="0"      inkscape:pageshadow="2"      inkscape:window-width="2736"      inkscape:window-height="1714"      id="namedview125"      showgrid="false"      inkscape:zoom="13.112098"      inkscape:cx="67.5352"      inkscape:cy="32.763789"      inkscape:window-x="-12"      inkscape:window-y="-12"      inkscape:window-maximized="1"      inkscape:current-layer="layer1" />   <defs      id="defs5200" />   <metadata      id="metadata5203">     <rdf:RDF>       <cc:Work          rdf:about="">         <dc:format>image/svg+xml</dc:format>         <dc:type            rdf:resource="http://purl.org/dc/dcmitype/StillImage" />         <dc:title></dc:title>       </cc:Work>     </rdf:RDF>   </metadata>   <g      style="display:inline"      transform="translate(-12.104855,-1030.0402)"      id="layer1">     <rect        y="1036.3621"        x="30"        height="1"        width="103"        id="rect5206"        style="fill:#000000;fill-opacity:1" />     <rect        y="1037.2622"        x="25"        height="2.0999999"        width="1.000026"        id="rect5763"        style="opacity:0;fill:#000000;fill-opacity:1" />     <rect        y="1037.2622"        x="29.000103"        height="2.0999999"        width="1.000026"        id="rect5765"        style="opacity:0;fill:#000000;fill-opacity:1" />     <rect        y="1037.2622"        x="33.499855"        height="2.0999999"        width="0.5"        id="rect5765-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="37.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-4"        style="fill:#000000;fill-opacity:1;stroke-width:0.70710677" />     <rect        y="1037.3622"        x="41.399857"        height="4"        width="0.60000002"        id="rect5822"        style="fill:#000000;fill-opacity:1;stroke-width:0.63245553" />     <rect        y="1037.2622"        x="45.499855"        height="2.0999999"        width="0.5"        id="rect5763-5"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="49.499855"        height="2.0999999"        width="0.5"        id="rect5765-7"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="53.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="57.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-4-2"        style="fill:#000000;fill-opacity:1;stroke-width:0.70710677" />     <rect        y="1037.3622"        x="61.399857"        height="4"        width="0.60000002"        id="rect5822-6"        style="fill:#000000;fill-opacity:1;stroke-width:0.63245553" />     <rect        y="1037.2622"        x="65.499855"        height="2.0999999"        width="0.5"        id="rect5763-5-2"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="69.499855"        height="2.0999999"        width="0.5"        id="rect5765-7-5"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="73.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-9-0"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="77.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-4-2-3"        style="fill:#000000;fill-opacity:1;stroke-width:0.70710677" />     <rect        y="1037.3622"        x="81.399857"        height="6"        width="0.60000002"        id="rect5822-6-5"        style="fill:#000000;fill-opacity:1;stroke-width:0.77459669" />     <rect        y="1037.2622"        x="85.499855"        height="2.0999999"        width="0.5"        id="rect5763-5-2-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="89.499855"        height="2.0999999"        width="0.5"        id="rect5765-7-5-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="93.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-9-0-0"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="97.499855"        height="2.0999999"        width="0.5"        id="rect5765-9-4-2-3-5"        style="fill:#000000;fill-opacity:1;stroke-width:0.70710677" />     <rect        y="1037.3622"        x="101.39986"        height="4"        width="0.60000002"        id="rect5822-6-5-4"        style="fill:#000000;fill-opacity:1;stroke-width:0.63245553" />     <rect        y="1037.2622"        x="105.49986"        height="2.0999999"        width="0.5"        id="rect5763-5-2-9-6"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="109.49986"        height="2.0999999"        width="0.5"        id="rect5765-7-5-9-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="113.49986"        height="2.0999999"        width="0.5"        id="rect5765-9-9-0-0-8"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="117.49986"        height="2.0999999"        width="0.5"        id="rect5765-9-4-2-3-5-0"        style="fill:#000000;fill-opacity:1;stroke-width:0.70710677" />     <rect        y="1037.3622"        x="121.39986"        height="4"        width="0.60000002"        id="rect5822-6-5-4-7"        style="fill:#000000;fill-opacity:1;stroke-width:0.63245553" />     <rect        y="1037.2622"        x="125.49986"        height="2.0999999"        width="0.5"        id="rect5763-5-2-9-6-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="129.49985"        height="2.0999999"        width="0.5"        id="rect5765-7-5-9-9-9"        style="fill:#000000;fill-opacity:1;stroke-width:0.70709759" />     <rect        y="1037.2622"        x="133.00023"        height="2.0999999"        width="1.000026"        id="rect5765-9-9-0-0-8-0"        style="opacity:0;fill:#000000;fill-opacity:1" />     <rect        y="1037.2622"        x="136.99986"        height="2.0999999"        width="1"        id="rect5765-9-4-2-3-5-0-5"        style="opacity:0;fill:#000000;fill-opacity:1" />     <rect        y="1036.6622"        x="21.204855"        height="0.40000001"        width="8.8000002"        id="rect6036"        style="fill:#000000;fill-opacity:1" />     <rect        y="1036.9623"        x="21.206226"        height="5.4000001"        width="0.3491767"        id="rect6036-5"        style="fill:#000000;fill-opacity:1" />     <rect        transform="scale(-1,1)"        y="1036.6621"        x="-141.80486"        height="0.40000001"        width="8.8000002"        id="rect6036-2"        style="fill:#000000;fill-opacity:1" />     <rect        transform="scale(-1,1)"        y="1036.9622"        x="-141.80486"        height="5.4000001"        width="0.40000001"        id="rect6036-5-2"        style="fill:#000000;fill-opacity:1" />     <text        id="label10"        y="1046.5059"        x="21.174191"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.5059"          x="21.174191"          id="tspan3851">extrem schlecht</tspan></text>     <text        id="label20"        y="1046.5059"        x="41.174191"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.5059"          x="41.174191"          id="tspan3851-5">schlecht</tspan></text>     <text        id="label30"        y="1046.6182"        x="61.267941"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.6182"          x="61.267941"          id="tspan3851-5-5">dürftig</tspan></text>     <text        id="label40"        y="1046.6058"        x="81.267944"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.6058"          x="81.267944"          id="tspan3851-5-5-2">ordentlich</tspan></text>     <text        id="label50"        y="1046.4182"        x="101.4683"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.4182"          x="101.4683"          id="tspan3851-5-5-2-6">gut</tspan></text>     <text        id="label60"        y="1046.5182"        x="121.25037"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.5182"          x="121.25037"          id="tspan3851-5-5-2-1">ausgezeichnet</tspan></text>     <text        id="label70"        y="1046.5059"        x="141.63435"        style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.8px;line-height:100%;font-family:Sans;-inkscape-font-specification:Sans;text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;display:inline;fill:#000000;fill-opacity:1;stroke:none"        xml:space="preserve"><tspan          y="1046.5059"          x="141.63435"          id="tspan3851-5-5-2-1-6">ideal</tspan></text>   </g>   <g      style="display:inline"      transform="translate(7.8951471,6.3219508)"      id="layer3">     <ellipse        id="12"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="5.4548545"        cy="1.5720948"        rx="1"        ry="2.5" />     <ellipse        id="13"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="7.5048547"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="14"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="9.5048542"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="15"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="11.504855"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="16"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="13.504855"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="17"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="15.504855"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="18"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="17.504854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="19"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="19.504854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="20"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="21.404854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="22"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="25.454855"        cy="1.5720948"        rx="1"        ry="2.5" />     <ellipse        id="23"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="27.504854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="24"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="29.504854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="25"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="31.504854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="26"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="33.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="27"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="35.504856"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="28"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="37.504856"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="29"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="39.504856"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="30"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="41.404854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="21"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="23.354855"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="32"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="45.454853"        cy="1.5720948"        rx="1"        ry="2.5" />     <ellipse        id="33"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="47.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="34"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="49.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="35"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="51.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="36"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="53.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="37"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="55.504856"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="38"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="57.504856"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="39"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="59.504856"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="40"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="61.404854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="31"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="43.354855"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="42"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="65.454857"        cy="1.5720948"        rx="1"        ry="2.5" />     <ellipse        id="43"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="67.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="44"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="69.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="45"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="71.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="46"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="73.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="47"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="75.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="48"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="77.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="49"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="79.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="50"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="81.404854"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="41"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="63.354855"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="52"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="85.454857"        cy="1.5720948"        rx="1"        ry="2.5" />     <ellipse        id="53"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="87.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="54"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="89.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="55"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="91.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="56"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="93.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="57"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="95.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="58"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="97.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="59"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="99.504852"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="60"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="101.40485"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="51"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="83.354858"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="62"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="105.50486"        cy="1.5720948"        rx="1"        ry="2.5" />     <ellipse        id="63"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="107.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="64"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="109.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="65"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="111.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="66"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="113.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="67"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="115.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="68"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="117.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="69"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="119.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="70"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="121.55486"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="61"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="103.40485"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="11"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="3.4048545"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />     <ellipse        id="10"        style="opacity:0;fill:#000000;fill-opacity:0.45871558"        cx="1.4048545"        cy="1.5720948"        rx="0.94999999"        ry="2.5" />   </g>   <g      transform="translate(7.0000016,5.4565456)"      style="display:inline"      id="layer4">     <path        id="cross"        d="M 3.666497,-0.09404561 C 0.69774682,2.8434544 0.69774682,2.8434544 0.69774682,2.8434544 L 2.2289971,1.3747044 0.72899682,-0.15654561 3.697747,2.8434544"        style="fill:none;stroke:#000000;stroke-width:0.60000002;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />   </g> </svg>';
	// added to change attributes
	this.scaleImage.getElementById("label10").textContent = this.caption10;
	this.scaleImage.getElementById("label20").textContent = this.caption20;
	this.scaleImage.getElementById("label30").textContent = this.caption30;
	this.scaleImage.getElementById("label40").textContent = this.caption40;
	this.scaleImage.getElementById("label50").textContent = this.caption50;
	this.scaleImage.getElementById("label60").textContent = this.caption60;
	this.scaleImage.getElementById("label70").textContent = this.caption70;
};
QuestionnaireItemQuality7pt.prototype._getAnswerElements = function() {
    return this.scaleImage.getElementsByTagName("ellipse");
};
QuestionnaireItemQuality7pt.prototype.getAnswerOptions = function() {
    return "10-70";
};


/**
A QuestionnaireItem presenting a Visual Analogue Scale (100pt).

@class QuestionnaireItemVisualAnalogueScale

@augments QuestionnaireItemSVG
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {string} [captionRight] The caption of the left label.
@param {string} [captionLeft] The caption of the right label.
*/
function QuestionnaireItemVisualAnalogueScale(className, question, required, captionLeft, captionRight) {
    QuestionnaireItem.call(this, className, question, required);

    this.captionLeft = captionLeft;
    this.captionRight = captionRight;
}
QuestionnaireItemVisualAnalogueScale.prototype = Object.create(QuestionnaireItemSVG.prototype);
QuestionnaireItemVisualAnalogueScale.prototype.constructor = QuestionnaireItemVisualAnalogueScale;
QuestionnaireItemVisualAnalogueScale.prototype._setupSVG = function() {
    this.scaleImage.setAttribute("viewBox", "0 2 170 19.39");
    this.scaleImage.innerHTML = '<?xml version="1.0" encoding="utf-8" standalone="no"?><svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="170" height="19.389999" id="svg5198" version="1.1"><defs id="defs5200" /><metadata id="metadata5203"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title /></cc:Work></rdf:RDF></metadata><g style="display:inline" transform="translate(-12.104855,-1032.0442)" id="layer1"><rect y="1041.6211" x="36.598698" height="0.84977901" width="120.59571" id="rect5206" style="fill:#000000;fill-opacity:1" /><rect y="1042.6252" x="40.371223" height="2.0999999" width="1.000026" id="rect5763" style="opacity:0;fill:#000000;fill-opacity:1" /><rect y="1042.6252" x="44.371326" height="2.0999999" width="1.000026" id="rect5765" style="opacity:0;fill:#000000;fill-opacity:1" /><rect y="1042.6252" x="148.37146" height="2.0999999" width="1.000026" id="rect5765-9-9-0-0-8-0" style="opacity:0;fill:#000000;fill-opacity:1" /><rect y="1042.6252" x="152.37109" height="2.0999999" width="1" id="rect5765-9-4-2-3-5-0-5" style="opacity:0;fill:#000000;fill-opacity:1" /><text transform="translate(12.104855,1032.0442)" id="text4739" y="18.240952" x="6.717514" style="font-style:normal;font-weight:normal;font-size:40px;line-height:125%;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#000000;fill-opacity:1;stroke:none" xml:space="preserve"><tspan y="18.240952" x="6.717514" id="tspan4741" /></text><text id="labelLeft" y="1043.1372" x="34.33847" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.75px;line-height:100%;font-family:Sans;text-align:end;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:end;display:inline;fill:#000000;fill-opacity:1;stroke:none" xml:space="preserve"><tspan style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.75px;line-height:100%;font-family:Sans;-inkscape-font-specification:"Sans, Normal";text-align:end;writing-mode:lr-tb;text-anchor:end" id="tspan3853" y="1043.1372" x="34.33847">left</tspan></text><text id="labelRight" y="1042.7738" x="158.26675" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.75px;line-height:100%;font-family:Sans;text-align:start;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;display:inline;fill:#000000;fill-opacity:1;stroke:none" xml:space="preserve"><tspan style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.75px;line-height:100%;font-family:Sans;-inkscape-font-specification:"Sans, Normal";text-align:start;writing-mode:lr-tb;text-anchor:start" id="tspan3853-3" y="1042.7738" x="158.26675">right</tspan></text></g><g id="g3179" transform="translate(7.8951471,4.3179676)" style="display:inline"><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="52" cx="67.923729" cy="4.8909831" rx="0.60754085" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="53" cx="69.169189" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="54" cx="70.38427" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="55" cx="71.599358" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="56" cx="72.814438" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="57" cx="74.029518" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="58" cx="75.244598" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="59" cx="76.459679" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="60" cx="77.614006" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="62" cx="80.074547" cy="4.8909831" rx="0.60754085" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="63" cx="81.320007" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="64" cx="82.535088" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="65" cx="83.750168" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="66" cx="84.965248" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="67" cx="86.180328" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="68" cx="87.395416" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="69" cx="88.610497" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="70" cx="89.764824" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="61" cx="78.798714" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="72" cx="92.225365" cy="4.8909831" rx="0.60754085" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="73" cx="93.470825" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="74" cx="94.685905" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="75" cx="95.900986" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="76" cx="97.116066" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="77" cx="98.331146" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="78" cx="99.546227" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="79" cx="100.76131" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="80" cx="101.91564" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="71" cx="90.949532" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="82" cx="104.37618" cy="4.8909831" rx="0.60754085" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="83" cx="105.62164" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="84" cx="106.83672" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="85" cx="108.0518" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="86" cx="109.26688" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="87" cx="110.48196" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="88" cx="111.69704" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="89" cx="112.91213" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="90" cx="114.06646" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="81" cx="103.10034" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="92" cx="116.527" cy="4.8909831" rx="0.60754085" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="93" cx="117.77245" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="94" cx="118.98756" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="95" cx="120.20262" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="96" cx="121.41772" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="97" cx="122.63278" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="98" cx="123.84787" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="99" cx="125.06295" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="100" cx="126.21729" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="91" cx="115.25116" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="102" cx="128.70819" cy="4.8909831" rx="0.60754085" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="103" cx="129.95364" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="104" cx="131.16875" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="105" cx="132.38382" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="106" cx="133.59892" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="107" cx="134.81398" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="108" cx="136.02905" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="109" cx="137.24414" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="101" cx="127.43235" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="51" cx="66.678268" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="50" cx="65.463188" cy="4.8909831" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="12" cx="19.137701" cy="4.9351368" rx="0.60754085" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="13" cx="20.383158" cy="4.9351363" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="14" cx="21.59824" cy="4.9351363" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="15" cx="22.813322" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="16" cx="24.028404" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="17" cx="25.243486" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="18" cx="26.458567" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="19" cx="27.673649" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="20" cx="28.827976" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="22" cx="31.288517" cy="4.9351368" rx="0.60754085" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="23" cx="32.533978" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="24" cx="33.749058" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="25" cx="34.964138" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="26" cx="36.179222" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="27" cx="37.394302" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="28" cx="38.609386" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="29" cx="39.824467" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="30" cx="40.978794" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="21" cx="30.012684" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="33" cx="44.776421" cy="4.8909426" rx="0.60754085" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="34" cx="46.021881" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="35" cx="47.236961" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="36" cx="48.452042" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="37" cx="49.667126" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="38" cx="50.882206" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="39" cx="52.097286" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="40" cx="53.31237" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="41" cx="54.466698" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="32" cx="43.500587" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.1714536;stroke-miterlimit:4;stroke-dasharray:none" id="43" cx="56.927238" cy="4.8909426" rx="0.60754085" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="44" cx="58.172695" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="45" cx="59.387779" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="46" cx="60.602859" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="47" cx="61.817944" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="48" cx="63.033028" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="49" cx="64.248108" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="42" cx="55.651402" cy="4.8909426" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="11" cx="17.892241" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="10" cx="16.677158" cy="4.9351368" rx="0.57716382" ry="2.5" /><ellipse style="display:inline;opacity:0;fill:#000000;fill-opacity:1;stroke-width:1.20188606;stroke-miterlimit:4;stroke-dasharray:none" id="31" cx="42.190598" cy="4.9004354" rx="0.57716382" ry="2.5" /></g><g transform="translate(7.0000016,3.4525612)" style="display:inline" id="layer4"><path id="cross" d="m 19.355597,5.0112288 c -2.96875,2.9375 -2.96875,2.9375 -2.96875,2.9375 l 1.53125,-1.46875 -1.5,-1.53125 2.96875,3" style="display:inline;fill:none;stroke:#000000;stroke-width:0.60000002;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" /></g></svg>';

    this.scaleImage.getElementById("labelLeft").textContent = this.captionLeft;
    this.scaleImage.getElementById("labelRight").textContent = this.captionRight;
};
QuestionnaireItemVisualAnalogueScale.prototype._getAnswerElements = function() {
    return this.scaleImage.getElementsByTagName("ellipse");
};
QuestionnaireItemVisualAnalogueScale.prototype.getAnswerOptions = function(data) {
    return "10-109";
};

/**
An abstract QuestionnaireItem for system-defined answers.
These will be answered automatically and should not provide a UI.
 
@abstract
@class QuestionnaireItemSystem
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
*/
function QuestionnaireItemSystem() {
    QuestionnaireItem.apply(this, arguments);
}
QuestionnaireItemSystem.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemSystem.prototype.constructor = QuestionnaireItemSystem;
QuestionnaireItemSystem.setVisible = function(visible) {
    //NOPE
};
QuestionnaireItemSystem.isVisible = function() {
    return false;
};
/**
A QuestionnaireItem that gives a _constant_ answer.
Useful for store information that are useful in the data to be exported.

@class QuestionnaireItemSystemConst

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemSystem

@param {string} question First slot for information.
@param {string} answer Second slot for information.
*/
function QuestionnaireItemSystemConst(question, answer) {
    QuestionnaireItemSystem.call(this, null, question, false);
    this.answer = answer;
}
QuestionnaireItemSystemConst.prototype = Object.create(QuestionnaireItemSystem.prototype);
QuestionnaireItemSystemConst.prototype.constructor = QuestionnaireItemSystemConst;

QuestionnaireItemSystemConst.prototype.createUI = function() {};

QuestionnaireItemSystemConst.prototype.releaseUI = function() {};

QuestionnaireItemSystemConst.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};

QuestionnaireItemSystemConst.prototype._checkData = function(data) {
    return (data[0] === this.question && data[1] === this.answer);
};

QuestionnaireItemSystemConst.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.question = data[0];
    this.setAnswer(data[1]);
    return true;
};

/**
A QuestionnaireItemSystem that stores the current date time when this element was used, i.e., `createUI()` called.
The answer is the time and date when the function createUI() is called.

@class QuestionnaireItemSystemScreenDateTime
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemSystem
*/
function QuestionnaireItemSystemScreenDateTime() {
    QuestionnaireItemSystem.call(this, null, "DateTime", false);
}
QuestionnaireItemSystemScreenDateTime.prototype = Object.create(QuestionnaireItemSystem.prototype);
QuestionnaireItemSystemScreenDateTime.prototype.constructor = QuestionnaireItemSystemScreenDateTime;

QuestionnaireItemSystemScreenDateTime.prototype.createUI = function() {
    this.answer = new Date().toString();
};
QuestionnaireItemSystemScreenDateTime.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};
QuestionnaireItemSystemScreenDateTime.prototype._checkData = function(data) {
    return (data[0] === this.question);
};
QuestionnaireItemSystemScreenDateTime.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[1]);
    return true;
};

/**
A QuestionnaireItemSystem that stores the time it was shown, i.e., createUI() and releaseUI().

Reports in milliseconds.

@class QuestionnaireItemSystemScreenDuration
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemSystem
*/
function QuestionnaireItemSystemScreenDuration() {
    QuestionnaireItemSystem.call(this, null, "Screen Duration", false);
    this.startTime = null;
}
QuestionnaireItemSystemScreenDuration.prototype = Object.create(QuestionnaireItemSystem.prototype);
QuestionnaireItemSystemScreenDuration.prototype.constructor = QuestionnaireItemSystemScreenDuration;

QuestionnaireItemSystemScreenDuration.prototype.createUI = function() {
    this.startTime = new Date().getTime();
};
QuestionnaireItemSystemScreenDuration.prototype.isReady = function() {
    return true;
};
QuestionnaireItemSystemScreenDuration.prototype.releaseUI = function() {
    this.answer = new Date().getTime() - this.startTime;
};
QuestionnaireItemSystemScreenDuration.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};
QuestionnaireItemSystemScreenDuration.prototype._checkData = function(data) {
    return (data[0] === this.question);
};
QuestionnaireItemSystemScreenDuration.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[1]);
    return true;
};

/**
A QuestionnaireItem that stores the current URL of the web browser.

@class QuestionnaireItemSystemURL

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemSystem
@augments QuestionnaireItemSystemConst
*/
function QuestionnaireItemSystemURL() {
    QuestionnaireItemSystemConst.call(this, "URL", window.location.href);
}
QuestionnaireItemSystemURL.prototype = Object.create(QuestionnaireItemSystemConst.prototype);
QuestionnaireItemSystemURL.prototype.constructor = QuestionnaireItemSystemURL;

/**
A QuestionnaireItem for one line text input.
This item uses a HTML input field.

@class QuestionnaireItemText

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]
*/
function QuestionnaireItemText(className, question, required) {
    QuestionnaireItem.call(this, className, question, required);

    this.input = null;
}
QuestionnaireItemText.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemText.prototype.constructor = QuestionnaireItemText;

QuestionnaireItemText.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this.input = document.createElement("input");
    this.input.addEventListener("change", this._handleChange.bind(this));

    this.node.appendChild(this.input);

    this._applyAnswerToUI();
    return node;
};

QuestionnaireItemText.prototype._handleChange = function(event) {
    if (this.input.value === "") {
         this.setAnswer(null);
    } else {
         this.setAnswer(this.input.value);
    }

    TheFragebogen.logger.info(this.constructor.name + "._handleChange()", this.getAnswer() + ".");
};

QuestionnaireItemText.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    if (this.isAnswered()) {
        this.input.value = this.getAnswer();
    }
};
/**
@param {string} answer answer
@returns {boolean}
*/
QuestionnaireItemText.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        this._applyAnswerToUI();
        return true;
    }

    this.answer = answer;
    this._applyAnswerToUI();
    this._sendReadyStateChanged();
    return true;
};

QuestionnaireItemText.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.input = null;
};

QuestionnaireItemText.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};

QuestionnaireItemText.prototype._checkData = function(data) {
    return (data[0] === this.question);
};

QuestionnaireItemText.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[1]);
    return true;
};

/**
A QuestionnaireItem for text input.
This item uses a HTML textarea.

@class QuestionnaireItemTextArea

@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} question
@param {boolean} [required=false]

@param {number} [rows=2] The number of rows.
@param {number} [cols=19] The number of colums.
@param {string} [placeholder=""] The placeholder text to show.
*/
function QuestionnaireItemTextArea(className, question, required, rows, cols, placeholder) {
    QuestionnaireItem.call(this, className, question, required);

    this.rows = !isNaN(rows) ? rows : 2;
    this.cols = !isNaN(cols) ? cols : 19;
    this.placeholder = (typeof placeholder === "string" ? placeholder : "");

    this.textarea = null;
    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: rows as " + this.rows + ", cols as " + this.cols + " and placeholder as " + this.placeholder);
}
QuestionnaireItemTextArea.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemTextArea.prototype.constructor = QuestionnaireItemTextArea;

QuestionnaireItemTextArea.prototype._createAnswerNode = function() {
    var node = document.createElement("div");

    this.textarea = document.createElement("textarea");
    this.textarea.rows = this.rows;
    this.textarea.cols = this.cols;
    this.textarea.placeholder = this.placeholder;
    this.textarea.addEventListener("change", this._handleChange.bind(this));

    node.appendChild(this.textarea);

    this._applyAnswerToUI();
    return node;
};
QuestionnaireItemTextArea.prototype._handleChange = function(event) {
    if (this.textarea.value === "") {
        this.setAnswer(null);
    } else {
        this.setAnswer(this.textarea.value);
    }

    TheFragebogen.logger.info("QuestionnaireItemTextArea._handleChange()", this.getAnswer() + ".");
};

QuestionnaireItemTextArea.prototype._applyAnswerToUI = function() {
    if (!this.isUIcreated()) {
        return;
    }

    if (this.isAnswered()) {
        this.textarea.value = this.getAnswer();
    }
};

/**
@param {string} answer
@returns {boolean}
*/
QuestionnaireItemTextArea.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        this._applyAnswerToUI();
        return true;
    }

    this.answer = answer;
    this._applyAnswerToUI();
    this._sendReadyStateChanged();
    return true;
};

QuestionnaireItemTextArea.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.textarea = null;
};

QuestionnaireItemTextArea.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};

QuestionnaireItemTextArea.prototype._checkData = function(data) {
    return (data[0] === this.question);
};

QuestionnaireItemTextArea.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[1]);
    return true;
};
/**
A QuestionnaireItem that waits for a defined number of seconds before setting itself ready.

No UI is displayed.

@class QuestionnaireItemSystemWait
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem
@augments QuestionnaireItemSystem

@param {number} waitTime waiting time in seconds
*/
function QuestionnaireItemSystemWait(waitTime) {
    QuestionnaireItemSystem.call(this, null, "", true);
    this.waitTime = waitTime;

    this.required = true;
    this.timeoutHandle = null;

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: waitTime as " + this.waitTime);
}
QuestionnaireItemSystemWait.prototype = Object.create(QuestionnaireItemSystem.prototype);
QuestionnaireItemSystemWait.prototype.constructor = QuestionnaireItemSystemWait;

QuestionnaireItemSystemWait.prototype.createUI = function() {
    this.setAnswer(null);
    this.timeoutHandle = setTimeout((this._waitTimeCallback).bind(this), this.waitTime);
};

QuestionnaireItemSystemWait.prototype._waitTimeCallback = function() {
    this.setAnswer(this.waitTime);
};

QuestionnaireItemSystemWait.prototype.releaseUI = function() {
    if (this.timeoutHandle !== null) {
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle === null;
    }
};

QuestionnaireItemSystemWait.prototype.getData = function() {
    return[this.waitTime];
};

QuestionnaireItemSystemWait.prototype._checkData = function(data) {
    return (data[0] === this.waitTime);
};

QuestionnaireItemSystemWait.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    return true;
};
/**
This QuestionnaireItem connects to a Websocket server and may
a) send a message (ignore incoming messages), 
b) wait until a certain message is received, or
c) a) and b).

Notes: 
* This QuestionnaireItem is _always_ required.
* Starts connecting on setting `QuestionnaireItemWaitWebsocket.setEnabled(true)`.
* Automatically tries to reconnect on connection failure: message resend on every reconnect.
  IMPORTANT: Please note that this approach is brute force and at the moment ignores _permanent failures_ (HTTP: 404) are not handled.
* After reaching timeout, this element sets itself to ready=true.


Uses CSS classes:
* this.className (Initial before enabling)
* this.className + "Connecting"
* this.className + "Connected"
* this.className + "Reconnecting"
* this.className + "Ready" (required message received)
* NOT this.className + "Required" via `Questionnaire.markRequired()`

@class QuestionnaireItemWaitWebsocket
@augments QuestionnaireItem
@param {string} [className] CSS class

@param {string} url The websocket URL, eg., ws://localhost:8080/someLocation.
@param {string} [messageReceive=undefined]
@param {string} [messageSend=undefined]
@param {number} [reconnectAttempts=-1] Number of attempts to reconnect; negative number: forever.
@param {number} [timeout=0] Timeout in seconds.
*/
function QuestionnaireItemWaitWebsocket(className, url, messageSend, messageReceive, reconnectAttempts, timeout) {
    QuestionnaireItem.call(this, className, "", true);

    this.url = url;
    this.messageSend = typeof messageSend === "string" ? messageSend : undefined;
    this.messageReceive = typeof messageReceive === "string" ? messageReceive : undefined;

    if (this.messageSend === undefined && this.messageReceive === undefined) {
        TheFragebogen.logger.error("QuestionnaireItemWaitWebsocket():", "messageSend and messageReceive are undefined; this component will not do anything.");
    }

    this.timeout = !isNaN(timeout) ? Math.abs(timeout) * 1000 : 0;
    this.timeoutHandle;

    this.node = null;
    this.websocketConnection = null;
    this.connectionFailures = 0;

    TheFragebogen.logger.warn("QuestionnaireItemWaitWebsocket():", "Set: url as " + this.url + ", messageSend as" + this.messageSend + ", messageReceive as " + this.messageReceive + "and timeout as " + this.timeout);
}
QuestionnaireItemWaitWebsocket.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemWaitWebsocket.prototype.constructor = QuestionnaireItemWaitWebsocket;
QuestionnaireItemWaitWebsocket.prototype.createUI = function () {
    this.node = document.createElement("div");
    this.node.className = this.className;
    return this.node;
};
QuestionnaireItemWaitWebsocket.prototype.setEnabled = function (enabled) {
    this.enabled = enabled;
    
    if (this.enabled) { //Let's connect (and start timer)!
        this._handleConnect();

        if (this.timeout !== 0) {
            this.timeoutHandle = setTimeout((this._onTimeout).bind(this), this.timeout);
        }
    }
};
QuestionnaireItemWaitWebsocket.prototype._handleConnect = function () {
    if (this.websocketConnection === null) {
        this.websocketConnection = new WebSocket(this.url);

        this.node.className = this.className + "Connecting";

        this.websocketConnection.onopen = this._onConnected.bind(this);
        this.websocketConnection.onmessage = this._onMessage.bind(this);
        this.websocketConnection.onerror = this._onWebsocketError.bind(this);
        this.websocketConnection.onclose = this._onWebsocketClose.bind(this);
    }
};
QuestionnaireItemWaitWebsocket.prototype._onConnected = function () {
    this.node.className = this.className + "Connected";

    if (this.messageSend === undefined) {
        TheFragebogen.logger.info(this.constructor.name + ".connection.onopen()", "Connection opened.");
    }
    
    this.websocketConnection.send(this.messageSend);
    TheFragebogen.logger.info(this.constructor.name + ".connection.onopen()", "Connection opened and message <<" + this.messageSend +  ">> delivered.");
};
QuestionnaireItemWaitWebsocket.prototype._onMessage = function (event) {
    if (event.data && event.data !==  this.messageReceive) {
        TheFragebogen.logger.warn(this.constructor.name + ".connection.onmessage()", "Received unknown message: <<" + event.data + ">>; waiting for <<" + this.messageReceive + ">>");
        return;
    }

    TheFragebogen.logger.info(this.constructor.name + ".connection.onmessage()", "Received correct message.");
    this.answer = new Date().toString();
    this.node.className = this.className + "Ready";
    
    this._sendReadyStateChanged();
};
QuestionnaireItemWaitWebsocket.prototype._onWebsocketError = function (error) {
    this.node.className = this.className + "Reconnecting";
    TheFragebogen.logger.warn(this.constructor.name + ".connection.onerror()", error);
    //Reconnect handled by onclose
};
QuestionnaireItemWaitWebsocket.prototype._onWebsocketClose = function () {
    TheFragebogen.logger.warn(this.constructor.name + ".connection.onclose()", "Connection closed.");

    if (this.isReady()) {
        return;
    }

    //Retry?
    if (this.connectionFailures < this.reconnectAttempts) {
        TheFragebogen.logger.warn(this.constructor.name + ".connection.onclose.setTimeout._anonymousFunction()", "Trying to reconnect...");

        this.websocketConnection = null;
        this._handleConnect();

        return;
    }

    //Failed permanently: That's bad...
    TheFragebogen.logger.error(this.constructor.name + ".connection.onclose()", "Maximal number of attempts reached. QuestionnaireItemWaitWebsocket will not try to reconnect again!");
    this.ready = true;
    this._sendReadyStateChanged();
};
QuestionnaireItemWaitWebsocket.prototype._onTimeout = function () {
    this._sendReadyStateChanged();

    TheFragebogen.logger.warn(this.constructor.name + "._handleTimeout()", "Waiting got timeout after " + (!this.connectionFailures ? (this.timeout + "ms.") : (this.connectionFailures + " attempt(s).")));
};
QuestionnaireItemWaitWebsocket.prototype.markRequired = function () {
    //This elements shows its status and is always required.
};
QuestionnaireItemWaitWebsocket.prototype.releaseUI = function () {
    this.node = null;

    clearTimeout(this.timeoutHandle);
    this.timeoutHandle = null;

    if (this.websocketConnection !== null && (this.websocketConnection.readyState == WebSocket.CONNECTING || this.websocketConnection.readyState == WebSocket.OPEN)) {
        this.websocketConnection.onclose = function () {
            TheFragebogen.logger.info(this.constructor.name + ".connection.onclose()", "Connection closed.");
        }
        this.websocketConnection.close();    
    }
    this.websocketConnection = null;
};

/**
A QuestionnaireItem for free-hand input (drawing or writing).
Uses mouse simulation to draw a canvas.

Reports answer as base64-coded PNG image.
ATTENTION: answer is stored on calling getAnswer() only.

Supports HDPI.

Apply "cursor: none;" if stylus input is used.

@class QuestionnaireItemWrite
@augments UIElement
@augments UIElementInteractive
@augments QuestionnaireItem

@param {string} [className] CSS class
@param {string} [question] The question
@param {boolean} [required=false] Is this QuestionnaireItem required to be answered?

@param {string} [backgroundImg] URL of the background image
@param {number} [height=240]
@param {number} [width=320]
@param {number} [drawSize=1] The radius of the pen in px.
@param {number} [eraserSize=10] The radius of the eraser in px.
*/
function QuestionnaireItemWrite(className, question, required, backgroundImg, width, height, drawColor, drawSize, eraserSize) {
    QuestionnaireItem.call(this, className, question, required);

    this.className = className;
    this.backgroundImg = backgroundImg;
    this.height = !isNaN(height) ? height : 240;
    this.width = !isNaN(width) ? width : 320;

    this.pixelRatio = 1; //HDPI support.
    this.drawColor = (typeof drawColor === "string" ? drawColor : "black");
    this.drawSize = !isNaN(drawSize) ? drawSize : 1;
    this.eraserSize = !isNaN(eraserSize) ? eraserSize : 10;

    TheFragebogen.logger.debug(this.constructor.name + "()", "Set: backgroundImg as " + this.backgroundImg + ", height as " + this.height + ", width as " + this.width + ", drawColor as " + this.drawColor + ", drawSize as " + this.drawSize + " and eraserSize as " + this.eraserSize);

    this.painting = false;
    this.penWasDown = false;
    this.eraserMode = false; //True: eraser, False: draw
    this.lastDrawX = null;
    this.lastDrawY = null;

    this.context = null;
}
QuestionnaireItemWrite.prototype = Object.create(QuestionnaireItem.prototype);
QuestionnaireItemWrite.prototype.constructor = QuestionnaireItemWrite;

QuestionnaireItemWrite.prototype._createAnswerNode = function() {
    var node = document.createElement("div");
    var canvas = document.createElement("canvas");
    if (this.width !== null) canvas.width = this.width;
    if (this.height !== null) canvas.height = this.height;
    node.appendChild(canvas);

    this.context = canvas.getContext("2d");
    this.context.lineJoin = "round";

    //Center background image
    if (this.backgroundImg !== null) {
        canvas.style.background = "url('" + this.backgroundImg + "') 50% 50% / contain no-repeat";
    }

    if (this.isAnswered()) {
        TheFragebogen.logger.debug(this.constructor.name + "_createAnswerNode()", "Already answered; restoring image.");

        var img = new Image();
        img.onload = function() {
            this.context.drawImage(img, 0, 0);
        }.bind(this);
        img.src = this.answer;
    }

    canvas.onmousedown = (this.onWritingStart).bind(this);
    canvas.onmousemove = (this.onWriting).bind(this);
    canvas.onmouseup = (this.onWritingStop).bind(this);
    canvas.onmouseout = (this.onWritingStop).bind(this);

    //BEGIN: EXPERIMENTAL
    //This uses allows us to be HDPI conform!
    //Only works in Chrome so far! And it is a hack! See: http://www.html5rocks.com/en/tutorials/canvas/hidpi/
    this.pixelRatio = window.devicePixelRatio || 1 / this.context.webkitBackingStorePixelRatio || 1;

    canvas.style.width = canvas.width;
    canvas.style.height = canvas.height;

    canvas.width = canvas.width * this.pixelRatio;
    canvas.height = canvas.height * this.pixelRatio;

    this.context.scale(this.pixelRatio, this.pixelRatio);
    //END: EXPERIMENTAL
    return node;
};
/**
Pen is down on the paper.
*/
QuestionnaireItemWrite.prototype.onWritingStart = function(event) {
    if (!this.isEnabled()) {
        return;
    }

    this.painting = true;
    this.eraserMode = event.button !== 0; //The not-left mouse button is the eraser
    this.penWasDown = false;

    this.onWriting(event);
};
/**
Pen is moving on the paper.
*/
QuestionnaireItemWrite.prototype.onWriting = function(event) {
    if (!this.isEnabled() || !this.painting) {
        return;
    }

    var x = event.pageX - event.target.offsetLeft;
    var y = event.pageY - event.target.offsetTop;

    this.context.beginPath();

    if (this.eraserMode) {
        this.context.globalCompositeOperation = "destination-out";
        this.context.arc(x, y, this.eraserSize, 0, Math.PI * 2, false);
        this.context.fill();
    } else {
        this.context.globalCompositeOperation = "source-over";
        if (this.penWasDown) {
            this.context.moveTo(this.lastDrawX, this.lastDrawY);
        } else {
            this.context.moveTo(x - 1, y);
        }

        this.context.lineTo(x, y);
        this.context.strokeStyle = this.drawColor;
        this.context.lineWidth = this.drawSize;
        this.context.stroke();
    }

    //The following lines cannot be put above, because it must be done after the draw.
    this.penWasDown = true;
    this.lastDrawX = x;
    this.lastDrawY = y;
};
/**
Pen left paper, so save the answer.
*/
QuestionnaireItemWrite.prototype.onWritingStop = function() {
    this.painting = false;

    if (this.isAnswered()) {
        this.markRequired();
    }
    this._sendReadyStateChanged();
};

QuestionnaireItemWrite.prototype.getAnswer = function() {
    if (this.isUIcreated() && this.isAnswered()) {
        this.answer = this.context.canvas.toDataURL("image/png");
    }

    return this.answer;
};

QuestionnaireItemWrite.prototype.setAnswer = function(answer) {
    if (answer === null) {
        this.answer = null;
        if (this.isUIcreated()) {
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        }
        return true;
    }
    if (typeof(answer) === "string") {
        this.answer = answer;
        if (this.isUIcreated()) {
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
            var img = new Image();
            img.src = answer;

            var ratio_w = img.width / parseInt(this.context.canvas.style.width);
            var ratio_h = img.height / parseInt(this.context.canvas.style.height);

            this.context.scale(1 / ratio_w, 1 / ratio_h);
            this.context.drawImage(img, 0, 0);
            this.context.scale(ratio_w, ratio_h);
        }
        this._sendReadyStateChanged();
        return true;
    }
    TheFragebogen.logger.warn(this.constructor.name + ".setAnswer()", "Invalid answer: " + answer + ".");
    return false;
};

QuestionnaireItemWrite.prototype.releaseUI = function() {
    this.node = null;
    this.uiCreated = false;
    this.enabled = false;

    this.getAnswer();

    this.context = null;
    this.pixelRatio = 1;
    this.lastDrawX = null;
    this.lastDrawY = null;
    this.penWasDown = false;
    this.painting = false;
    this.eraserMode = false;
};

QuestionnaireItemWrite.prototype.getData = function() {
    return[this.getQuestion(), this.getAnswer()];
};

QuestionnaireItemWrite.prototype._checkData = function(data) {
    return data[0] === this.question;
};

QuestionnaireItemWrite.prototype.setData = function(data) {
    if (!this._checkData(data)) {
        return false;
    }

    this.setAnswer(data[1]);
    return true;
};
