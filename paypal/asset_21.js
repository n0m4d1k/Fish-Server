"use strict";

function init() {
    const key = getListenerSearchKey('data-key');
    const sessionId = getListenerSearchKey('data-sessionId');
    const csrf = getListenerSearchKey('data-csrf');
    const action = getListenerSearchKey('data-action');
    const src = getListenerSearchKey('data-src');
    const submitURL = getListenerSearchKey('data-submitURL');
    const startTime = getListenerSearchKey('data-startTime');

	renderGRCV3Enterprise({
        key,
        action,
        sessionId,
        csrf,
        src,
        submitURL,
        startTime
    });

    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent",
        eventer = window[eventMethod],
        messageEvent = (eventMethod === "attachEvent") ? "onmessage" : "message",
        clickEvent = eventMethod === "attachEvent" ? "onclick" : "click";

        document[eventMethod](clickEvent,resizeWidget);

    eventer(messageEvent, function(e) {
        if(!e.data){
            return;
        }

        var data;
        try {
            data = e && JSON.parse(e.data);
        } catch(e) {
            return;
        }

        if (data.source !== "adframe") {
            return;
        }

		if(data.clientLog) {
			return recaptchaClientLogPostData(data.clientLog, csrf, sessionId);
		}


        if (data.reason === 'size') {
            resizeWidget(data);
            return;
        }

        if(data.action && data.action === 'logData') {
            return;
        }
        e.preventDefault();
        var xmlHttpReq = new XMLHttpRequest();
        xmlHttpReq.open("POST", data.submitURL, true);
        xmlHttpReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttpReq.setRequestHeader("x-requested-with", "XMLHttpRequest");
        xmlHttpReq.onload = function () {
        };
        var tokenBody = "grcV3EntToken=" + data.token;

        if(data.renderStartTime){
            tokenBody = tokenBody +"&grcV3RenderStartTime=" + data.renderStartTime;
        }

        if(data.renderEndTime){
            tokenBody = tokenBody +"&grcV3RenderEndTime=" + data.renderEndTime;
        }

        if(data.error){
            tokenBody = tokenBody + "&error=" + encodeURIComponent(data.error);
        }

        if(data.sessionId) {
            tokenBody = tokenBody + "&" + data.sessionId;
        }

        if(csrf) {
            tokenBody = tokenBody + "&_csrf=" + encodeURIComponent(csrf);
        }

        xmlHttpReq.send(tokenBody);
    },false);
}

function setStyle(element, stylename, stylevalue){
    try{
        element.style[stylename] = stylevalue;
    }
    catch(err){

    }
}

function resizeWidget(data){
    try{
        data = data || {};
        var frame = document.getElementById("grcv3enterpriseframe");

        if(!frame) return;

        if(data.state == 'OPEN'){
            frame.style.width="271px";
        }else{
            frame.style.width="74px";
        }
    }
    catch(err){

    }
}

function getListenerSearchKey(key) {
    var script_tag = document.getElementById('grcv3enterpriseframetag');
    return script_tag.getAttribute(key);
}

function getTargetOrigin(src){
    var allowedDomains = ['paypal.com','paypalinc.com','venmo.com','paypalobjects.com'];
    var targetOrigin = '/';
    try{
        if(!window.URL || !src){
            return targetOrigin;
        }

        var originUrl = new window.URL(src);
        if(!originUrl || !originUrl.hostname || typeof originUrl.hostname !== "string"){
            return targetOrigin;
        }

        var originUrlParts = originUrl.hostname.split('.');
        if(!originUrlParts){
            return targetOrigin;
        }

        if(Array && Array.isArray && !Array.isArray(originUrlParts)){
            return targetOrigin;
        }

        if(!originUrlParts.length || originUrlParts.length < 2){
            return targetOrigin;
        }

        originUrlParts = originUrlParts.slice(-2);
        if(!originUrlParts || !originUrlParts.length || originUrlParts.length < 2){
            return targetOrigin;
        }

        var referrerDomain = originUrlParts.join('.');
        if(!referrerDomain){
            return targetOrigin;
        }

        if(allowedDomains.indexOf(referrerDomain) >= 0){
            targetOrigin = originUrl.origin;
        }

    }
    catch(e){
        console.error(e);
    }
    return targetOrigin;

}

function renderGRCV3Enterprise(data) {

    var iframeElement = document.createElement("iframe");
    iframeElement.id = "grcv3enterpriseframe";
    iframeElement.src = data.src;
    iframeElement.sandbox = "allow-same-origin allow-scripts allow-popups";

    setStyle(iframeElement, "position", "fixed");
    setStyle(iframeElement, "bottom", "30px");
    setStyle(iframeElement, "right", "1.5px");
    setStyle(iframeElement, "width", "74px");
    setStyle(iframeElement, "transition", "width 0.3s ease 0s");
    setStyle(iframeElement, "height", "66px");
    setStyle(iframeElement, "border", "0");
    setStyle(iframeElement, "z-index", "2147483000");
    setStyle(iframeElement, "display", "none");

    iframeElement.onload = () => {
        var targetOrigin = getTargetOrigin(data.src) || '/';
        iframeElement.contentWindow.postMessage(JSON.stringify({
            skey: data.key,
            action: data.action,
            sessionId: data.sessionId,
            source: 'ADS',
            startTime: data.startTime,
            submitURL: data.submitURL,
            csrf: data.csrf
        }), targetOrigin);
    }
    document.body.appendChild(iframeElement);
}

function recaptchaClientLogPostData(data, csrf, sessionId){

	let pagename = 'main:authchallenge:' + window.location.pathname.replace(/\//g, ':');
	let fpti = {
		pgrp: pagename,
		page: pagename,
		captchaState: data
	};

	let xmlHttpReq = new XMLHttpRequest();
	xmlHttpReq.open('POST', '/auth/logclientdata');
	xmlHttpReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xmlHttpReq.timeout = 15000; // 15sec

	let dataToSend = {
		fpti : fpti,
		_csrf : csrf,
		_sessionID : sessionId
	};

	xmlHttpReq.send(JSON.stringify(dataToSend));
};

init();