'use strict';
var autosubmit = false,
	recaptchaCallback,
	recaptchaEnterpriseCallback;
var ADS_FPTI = (function(){

	var adsPluginDiv = document.getElementById('captcha-standalone'),
		csrf = adsPluginDiv.getAttribute('data-csrf'),
		sessionId = adsPluginDiv.getAttribute('data-sessionid');

	var isFPTIEnabled = typeof PAYPAL !== 'undefined' && typeof PAYPAL.analytics !== 'undefined' &&
		typeof PAYPAL.analytics.instance !== 'undefined' && typeof fpti !== 'undefined';

	if (isFPTIEnabled){
		PAYPAL.analytics.startClientErrorTracking();
		PAYPAL.analytics.startCPLTracking();
	}

	var postData = function (data){

		var xmlHttpReq = new XMLHttpRequest();
		xmlHttpReq.open('POST', '/auth/logclientdata');
		xmlHttpReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xmlHttpReq.timeout = 15000; // 15sec

		var dataToSend = {
			fpti : data,
			_csrf : csrf,
			_sessionID : sessionId
		};

		xmlHttpReq.send(JSON.stringify(dataToSend));
	};

	var customADSFPTITracking = function (data) {

		try{

			var pagename = 'main:authchallenge:' + window.location.pathname.replace(/\//g, ':');
			fpti.pgrp = pagename;
			fpti.page = pagename;

			if (data.captchaState) {
				fpti.captchaState = data.captchaState;
			}
			if (data.message) {
				fpti.message = data.message;
			}

			postData(fpti);
			fpti.captchaState = "";
			fpti.message="";

		}catch (e){
			PAYPAL.analytics.logJSError(new Error(e), "Failed to post data.", "CLIENT_SIDE_LOGGING_ERROR");
		}
	};

	return {

		STATES : {

			RECAPTCHA_SERVED: "CLIENT_SIDE_RECAPTCHA_SERVED",
			RECAPTCHA_SOLVED: "CLIENT_SIDE_RECAPTCHA_SOLVED",
			RECAPTCHA_NOT_REACHABLE: "CLIENT_SIDE_RECAPTCHA_NOT_REACHABLE",
			RECAPTCHA_EMPTY_TOKEN: "CLIENT_SIDE_RECAPTCHA_EMPTY_TOKEN",
			RECAPTCHA_RENDER_FAILURE: "CLIENT_SIDE_RECAPTCHA_RENDER_FAILURE",
			RECAPTCHA_MESSAGE_PARSE_FAILED : "CLIENT_SIDE_RECAPTCHA_MESSAGE_PARSE_FAILED",

			RECAPTCHA_API_JS_LOADED: "CLIENT_SIDE_RECAPTCHA_API_JS_LOADED",
			RECAPTCHA_ENTERPRISE_API_JS_LOADED: "CLIENT_SIDE_RECAPTCHA_ENTERPRISE_API_JS_LOADED",

			PPCAPTCHA_SERVED: "CLIENT_SIDE_PPCAPTCHA_SERVED",
			PPCAPTCHA_SOLVED: "CLIENT_SIDE_PPCAPTCHA_SOLVED",
			PPCAPTCHA_REFRESH: "CLIENT_SIDE_PPCAPTCHA_REFRESH",
			PPCAPTCHA_PLAY_AUDIO: "CLIENT_SIDE_PPCAPTCHA_PLAY_AUDIO",

			SJS_SERVED: "CLIENT_SIDE_SJS_SERVED",
			SJS_SOLVED: "CLIENT_SIDE_SJS_SOLVED",

			FALLBACK_SJS_TO_PPCAPTCHA: "CLIENT_SIDE_FALLBACK_SJS_TO_PPCAPTCHA",

			MESSAGE_FROM_NON_PAYPAL_ORIGIN: "CLIENT_SIDE_MESSAGE_FROM_NON_PAYPAL_ORIGIN",
			ARKOSE_SERVED: "CLIENT_SIDE_ARKOSE_SERVED",
			ARKOSE_SOLVED: "CLIENT_SIDE_ARKOSE_SOLVED",
			ARKOSE_NOT_REACHABLE: "CLIENT_SIDE_ARKOSE_NOT_REACHABLE",
			ARKOSE_RENDER_FAILURE: "CLIENT_SIDE_ARKOSE_RENDER_FAILURE",
			ARKOSE_MESSAGE_PARSE_FAILED : "CLIENT_SIDE_ARKOSE_MESSAGE_PARSE_FAILED",
			HCAPTCHA_SERVED: "CLIENT_SIDE_HCAPTCHA_SERVED",
			HCAPTCHA_SOLVED: "CLIENT_SIDE_HCAPTCHA_SOLVED",
			HCAPTCHA_NOT_REACHABLE: "CLIENT_SIDE_HCAPTCHA_NOT_REACHABLE",
			HCAPTCHA_RENDER_FAILURE: "CLIENT_SIDE_HCAPTCHA_RENDER_FAILURE",
			RECAPTCHAV3_SERVED: "CLIENT_SIDE_RECAPTCHAV3_SERVED",
			RECAPTCHAV3_SOLVED: "CLIENT_SIDE_RECAPTCHAV3_SOLVED",
			RECAPTCHAV3_NOT_REACHABLE: "CLIENT_SIDE_RECAPTCHAV3_NOT_REACHABLE",
			RECAPTCHAV3_RENDER_FAILURE: "CLIENT_SIDE_RECAPTCHAV3_RENDER_FAILURE",
			RECAPTCHAV3_ENTERPRISE_API_JS_LOADED: "CLIENT_SIDE_RECAPTCHAV3_ENTERPRISE_API_JS_LOADED",
			HCAPTCHA_PASSIVE_JS_LOADED: "CLIENT_SIDE_HCAPTCHA_PASSIVE_JS_LOADED",
			HCAPTCHA_PASSIVE_SERVED: "CLIENT_SIDE_HCAPTCHA_PASSIVE_SERVED",
			HCAPTCHA_PASSIVE_SOLVED: "CLIENT_SIDE_HCAPTCHA_PASSIVE_SOLVED",
			HCAPTCHA_PASSIVE_NOT_REACHABLE: "CLIENT_SIDE_HCAPTCHA_PASSIVE_NOT_REACHABLE",
			HCAPTCHA_PASSIVE_RENDER_FAILURE: "CLIENT_SIDE_HCAPTCHA_PASSIVE_RENDER_FAILURE",
		},
		CAPTCHA_TYPE : {
			GOOGLE_RECAPTCHA:"",
			PAYPAL:"",
			SILENT_JS:"",
			AROKSE_CAPTCHA:"arkose",
			HCAPTCHA:"hcaptcha",
			GOOGLE_RECAPTCHAV3:"recaptchav3",
			HCAPTCHA_PASSIVE:"hcaptchapassive"
		},
		RENDER_FAILURE : "RENDER_FAILURE",

		NOT_REACHABLE : "NOT_REACHABLE",

		EMPTY_TOKEN : "EMPTY_TOKEN",

		IS_FPTI_ENABLED : isFPTIEnabled,

		triggerADSClientSideFPTITracking: function (data) {
			try {
				isFPTIEnabled && customADSFPTITracking(data);
			} catch (e) {
				//this can be ignored, the error is originated from PAYPAL.analytics.logJSError
			}
		}

	};

}());


window.onload = function (e) {

	if (ADS_FPTI.IS_FPTI_ENABLED) {
		try{
			var clientData = function(){
				var val;
				try {
					val = 'Navigator(appCodeName=' + navigator.appCodeName + '|appName=' + navigator.appName + '|appVersion=' + navigator.appVersion + '|userAgent=' + navigator.userAgent + '|webdriver' + navigator.webdriver + '|deviceMemory' + navigator.deviceMemory;
					val = val + '|geolocation(';
					if (navigator.geolocation !== undefined) {
						val = val + 'Available)';
					} else {
						val = val + 'NotAvailable)';
					}
					val = val + '|language=' + navigator.language + '|onLine=' + navigator.onLine + '|platform=' + navigator.platform + '|product=' + navigator.product + ')';
					val = val + '|History(' + history.length + ')';
					val = val + '|screen(' + screen.width + ',' + screen.height + ',' + screen.availWidth + ',' + screen.availHeight + ',' + screen.colorDepth + ',' + screen.pixelDepth + ')';
					val = val + '|window(Width=' + (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) + '|height=' + (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
					val = val + '|mozRTCPeerConnection=' + window.mozRTCPeerConnection + '|Chrome=' + window.chrome + '|callPhantom=' + window.callPhantom + '|_phantom=' + window._phantom + '|str=' + window.str + '|length=' + window.length + '|devicePixelRatio=' + window.devicePixelRatio + ')';
					val = val + '|loginPresent(' + (document.getElementById('login') !== null) + ')';
					val = val + '|loginTitle(' + document.title + ')';
					val = val + '|referrer(' + document.referrer + ')';
					if (navigator.plugins === undefined) {
						val = val + '|No Plugin data';
					} else {
						val = val + '|plugins:';
						for (var i = 0, len = navigator.plugins.length; i < len; i++) {
							val = val + '(' + navigator.plugins[i].name + " | " + navigator.plugins[i].filename + " | " + navigator.plugins[i].description + " | " + ')';
						}
					}
					val = val + '|hardwareConcurrency(' + navigator.hardwareConcurrency + ')';
					val = val + '|mozLockOrientation(' + screen.mozLockOrientation + ')';
					val = val + '|mozUnlockOrientation(' + screen.mozUnlockOrientation + ')';
					val = val + '|mozOrientation(' + screen.mozOrientation + ')';
					try{
						null[0]();
						val = val + '|Error(No Error)';
					}catch(e){
						val = val + '|Error(' + e + ')';
					}
				} catch (err) {
					val = 'Error processing script:' + err.message
				}
				return val !== undefined ? val : 'Almost there';
			};

			var pagename = 'main:authchallenge:' + window.location.pathname.replace(/\//g, ':');
			var options = {
				pageData: {page: pagename, ads_client_data: clientData()}
			};
			PAYPAL.analytics.endCPLTracking(options);
		} catch (err){
			try{
				PAYPAL.analytics.logJSError(new Error(err), "Error fetching client side parameters.", "CLIENT_SIDE_LOGGING_ERROR");
			}catch(e){}
		}

	}
};


(function() {
    var adsPluginDiv = document.getElementById('captcha-standalone'),
        captchaType = 'ppcaptcha',
		jsonCaptchaFlow = false,
		isInlineCaptcha,
		inlineCaptchaForm;
    if (adsPluginDiv) {
        captchaType = adsPluginDiv.getAttribute('data-captcha-type');
        autosubmit = !adsPluginDiv.getAttribute('data-disable-autosubmit') ||
                        adsPluginDiv.getAttribute('data-disable-autosubmit') !== "true",
		jsonCaptchaFlow = adsPluginDiv.getAttribute('data-json-captcha-flow') === "true";
		isInlineCaptcha = adsPluginDiv.getAttribute('data-inline-captcha') === "true";

		if(isInlineCaptcha){
			inlineCaptchaForm = document.getElementById('ads-plugin').closest("form");
		}

        if (!autosubmit && (captchaType === 'recaptcha' || captchaType === 'arkose' || captchaType === 'hcaptcha' || captchaType === ADS_FPTI.CAPTCHA_TYPE.GOOGLE_RECAPTCHAV3 || captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA_PASSIVE )) {
            var continueButton = document.querySelector('#ads-plugin #continue');
			if(continueButton) continueButton.style.display = "none";
        }

        var jse = adsPluginDiv.getAttribute('data-jse');
        if (jse) {
            appendInputElementToForm('jse', jse);
        }
    }

    var notifyInterceptor = function () {
        if (jsonCaptchaFlow) {
            var challengeRenderedEvent = document.createEvent('Event');
            challengeRenderedEvent.initEvent('challengerendered', true, true);
            document.getElementById('captcha-standalone').dispatchEvent(challengeRenderedEvent);
        }
	},
	fallbackChallenge = function () {
        autosubmit = false;
        document.getElementById('ads-plugin').style.display = "block";
        notifyInterceptor();
	},
	getClientParseMessage = function() {
		var message = ADS_FPTI.STATES.RECAPTCHA_MESSAGE_PARSE_FAILED;
		if (captchaType === 'arkose') {
			message = ADS_FPTI.STATES.ARKOSE_MESSAGE_PARSE_FAILED;
		}
		return message;
	},
	submitGRCV3 = function(data) {
		var xmlHttpReq = new XMLHttpRequest();
		xmlHttpReq.open("POST", "/auth/verifygrcenterprise", true);
		xmlHttpReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xmlHttpReq.setRequestHeader("x-requested-with", "XMLHttpRequest");
		xmlHttpReq.onload = function () {
		};
		
		var tokenBody = [];

		if(data.csrf) {
			tokenBody.push("_csrf=" + encodeURIComponent(data.csrf));
		}
		if(data.timestamp) {
			tokenBody.push("refTimestamp=" + data.timestamp);
		}
		if(data.token){
			tokenBody.push("grcV3EntToken=" + data.token);
		}
		if(data.grcV3EntSiteKey) {
			tokenBody.push("publicKey=" + encodeURIComponent(data.grcV3EntSiteKey));
		}
		if(data.renderStartTime){
			tokenBody.push("grcV3RenderStartTime=" + data.renderStartTime);
		}
		if(data.renderEndTime){
			tokenBody.push("grcV3RenderEndTime=" + data.renderEndTime);
		}
		if(data.error){
			tokenBody.push("error=" + encodeURIComponent(data.error));
		}
		if(data.sessionID){
			tokenBody.push("_sessionID=" + encodeURIComponent(data.sessionID));
		}

		tokenBody = tokenBody.join("&");
		
		xmlHttpReq.send(tokenBody);
	}; 

	function appendInputElementToForm(inputName, inputValue){
		var inputElement = document.querySelector('form input[name="' + inputName + '"]');
		if (inputElement) {
			inputElement.parentNode.removeChild(inputElement);
		}

		var inputElement = document.createElement("input");
		inputElement.type = 'hidden';
		inputElement.name = inputName;
		inputElement.value = inputValue;

		if(isInlineCaptcha){
			inlineCaptchaForm.appendChild(inputElement);
		}else{
			document.forms["challenge"].appendChild(inputElement);
		}
	}

    if (autosubmit) {

		var challengeScript = document.createElement('script'),
			adsChallengeUrl = adsPluginDiv.getAttribute('data-ads-js-challenge-url');
		if (!adsChallengeUrl) {
			ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.FALLBACK_SJS_TO_PPCAPTCHA, message: "data-ads-js-challenge-url isn't present" , isInlineCaptcha : isInlineCaptcha});
			fallbackChallenge();
			return;
		}

		challengeScript.src = adsChallengeUrl;
		challengeScript.onload = function () {

			try {
				ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.SJS_SERVED , isInlineCaptcha : isInlineCaptcha});

				if (typeof window['convertFunctionName'] === 'function') {
					appendInputElementToForm('ads_token_js', window['convertFunctionName'].call());
				} else {
					ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.FALLBACK_SJS_TO_PPCAPTCHA, message: 'convertFunctionName is not a function', isInlineCaptcha : isInlineCaptcha});
					fallbackChallenge();
					return;
				}
				appendInputElementToForm(window['postParamName'], window['postParamValue']);

				ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.SJS_SOLVED , isInlineCaptcha : isInlineCaptcha});

				if (!jsonCaptchaFlow && !isInlineCaptcha) {
					document.forms["challenge"].submit();
				}
				notifyInterceptor();
			} catch (e) {
				// Exception occured, fallback to ppcaptcha
				ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.FALLBACK_SJS_TO_PPCAPTCHA, message: e , isInlineCaptcha : isInlineCaptcha});
				fallbackChallenge();
			}
		};
		challengeScript.onerror = function () {
			ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.FALLBACK_SJS_TO_PPCAPTCHA, message: "ERROR" , isInlineCaptcha : isInlineCaptcha });
			fallbackChallenge();
		};
		adsPluginDiv.appendChild(challengeScript);

    } else {
        autosubmit = false;
		document.getElementById('ads-plugin').style.display = "block";
		var validateChallengeInput;
        if(captchaType === 'recaptcha' || captchaType === 'arkose' || captchaType === 'hcaptcha' || captchaType === 'recaptchav3' || captchaType === 'hcaptchapassive'){
			validateChallengeInput = function (challengeForm) {
				if (inlineCaptchaForm && inlineCaptchaForm.elements) {
					var recaptchaInput = challengeForm.elements['recaptcha'];
					if (recaptchaInput && typeof recaptchaInput.value === 'string') {
						return true;
					}
				}
				var iframeRecaptchav2 = document.getElementById('frameRecaptcha');
				if (iframeRecaptchav2 && iframeRecaptchav2.className.indexOf('error') === -1)
					iframeRecaptchav2.className = "error";
				var invalidInlineCode = document.querySelector('#ads-plugin p.invalidInlineCode');
				if (invalidInlineCode && invalidInlineCode.className.indexOf('hide') !== -1)
					invalidInlineCode.className = invalidInlineCode.className.replace(/\bhide\b/g, "");

				return false;
			};
			var submitChallengeAnswer = function (challengeAnswer,renderData) {
				var iframeRecaptchav2 = document.getElementById('frameRecaptcha');
				if (iframeRecaptchav2)
					iframeRecaptchav2.className = "";
				var invalidInlineCode = document.querySelector('#ads-plugin p.invalidInlineCode');
				if (invalidInlineCode && invalidInlineCode.className.indexOf('hide') === -1)
					invalidInlineCode.className = invalidInlineCode.className + " hide";

				var clientState = ADS_FPTI.STATES.RECAPTCHA_SOLVED;

				if(captchaType === 'arkose'){
					clientState = ADS_FPTI.STATES.ARKOSE_SOLVED;
					if(challengeAnswer === ADS_FPTI.RENDER_FAILURE){
						clientState = ADS_FPTI.STATES.ARKOSE_RENDER_FAILURE
					} else if(challengeAnswer === ADS_FPTI.NOT_REACHABLE){
						clientState = ADS_FPTI.STATES.ARKOSE_NOT_REACHABLE
					}
				} else if(captchaType === 'hcaptcha'){
					clientState = ADS_FPTI.STATES.HCAPTCHA_SOLVED;
					if(challengeAnswer === ADS_FPTI.RENDER_FAILURE){
						clientState = ADS_FPTI.STATES.HCAPTCHA_RENDER_FAILURE
					} else if(challengeAnswer === ADS_FPTI.NOT_REACHABLE){
						clientState = ADS_FPTI.STATES.HCAPTCHA_NOT_REACHABLE
					}
				} else if(captchaType === ADS_FPTI.CAPTCHA_TYPE.GOOGLE_RECAPTCHAV3){
					clientState = ADS_FPTI.STATES.RECAPTCHAV3_SOLVED;
					if(challengeAnswer === ADS_FPTI.RENDER_FAILURE){
						clientState = ADS_FPTI.STATES.RECAPTCHAV3_RENDER_FAILURE
					} else if(challengeAnswer === ADS_FPTI.NOT_REACHABLE){
						clientState = ADS_FPTI.STATES.RECAPTCHAV3_NOT_REACHABLE
					}
				} else if(captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA_PASSIVE){
					clientState = ADS_FPTI.STATES.HCAPTCHA_PASSIVE_SOLVED;
					if(challengeAnswer === ADS_FPTI.RENDER_FAILURE){
						clientState = ADS_FPTI.STATES.HCAPTCHA_PASSIVE_RENDER_FAILURE
					} else if(challengeAnswer === ADS_FPTI.NOT_REACHABLE){
						clientState = ADS_FPTI.STATES.HCAPTCHA_PASSIVE_NOT_REACHABLE
					}
				} else {
					if(challengeAnswer === ADS_FPTI.RENDER_FAILURE){
						clientState = ADS_FPTI.STATES.RECAPTCHA_RENDER_FAILURE
					} else if(challengeAnswer === ADS_FPTI.NOT_REACHABLE){
						clientState = ADS_FPTI.STATES.RECAPTCHA_NOT_REACHABLE
					}else if(challengeAnswer === ADS_FPTI.EMPTY_TOKEN){
						clientState = ADS_FPTI.STATES.RECAPTCHA_EMPTY_TOKEN
					}
				}
				
				ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: clientState , isInlineCaptcha : isInlineCaptcha});

				if (isInlineCaptcha) {
					if (clientState !== ADS_FPTI.STATES.RECAPTCHA_SOLVED) {
						//Refresh the captcha
						var xmlHttpReq = new XMLHttpRequest();
						xmlHttpReq.open('POST', '/auth/refreshinlinecaptcha', true);
						xmlHttpReq.setRequestHeader('Accept', 'application/json');
						xmlHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
						xmlHttpReq.setRequestHeader('x-requested-with', 'XMLHttpRequest');
						xmlHttpReq.onreadystatechange = function () {
							if (xmlHttpReq.readyState === 4 && xmlHttpReq.status === 200) {
								var response = JSON.parse(xmlHttpReq.responseText);
								if(response && response.inlineRefreshResponse) {
									adsPluginDiv = document.getElementById('ads-plugin');
									if (!adsPluginDiv) {
										return;
									}
									var parentNode = adsPluginDiv.parentNode;

									var adsPluginDivNew = document.createElement("div");
									adsPluginDivNew.innerHTML = response.inlineRefreshResponse;

									parentNode.replaceChild(adsPluginDivNew, adsPluginDiv);
									var loadAuthChallengeScript = function () {
										//Incase of PP captcha responses, this script has to be loaded after ppcaptcha script
										// finished loading
										var script = document.querySelector('#ads-plugin script[data-name=authchallenge]')
										if (script && script.src) {
											var captchaScripts = document.createElement('script')
											captchaScripts.type = 'text/javascript'
											captchaScripts.src = script.src
											adsPluginDivNew.appendChild(captchaScripts)
										}
									}
									var ppcaptchascript = document.querySelector('#ads-plugin script[data-name=ppcaptcha]')
									if (ppcaptchascript && ppcaptchascript.src) {
										var captchaScripts = document.createElement('script')
										captchaScripts.type = 'text/javascript'
										captchaScripts.src = ppcaptchascript.src
										captchaScripts.onload = function () {
											loadAuthChallengeScript();
										};
										captchaScripts.onerror = function () {
											loadAuthChallengeScript();
										};
										adsPluginDivNew.appendChild(captchaScripts)
									} else {
										loadAuthChallengeScript();
									}
								};
							}
						}
						xmlHttpReq.onerror = function () {
							//FPTI log and do nothing
						};
						xmlHttpReq.send('recaptcha=' + challengeAnswer + '&_csrf=' + encodeURIComponent(inlineCaptchaForm['_csrf'].value));
						return;
					}
				}

				appendInputElementToForm( captchaType === 'arkose'? 'arkose' : captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA ? ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA: captchaType === ADS_FPTI.CAPTCHA_TYPE.GOOGLE_RECAPTCHAV3 ? 'grcV3EntToken' : captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA_PASSIVE ? 'hcaptchaToken' : 'recaptcha', challengeAnswer);

				if(captchaType === 'arkose' && renderData){
					
					if(renderData && renderData.arkoseRenderStartTime && !isNaN(renderData.arkoseRenderStartTime)){
						appendInputElementToForm( 'arkose_render_start_time_utc', renderData.arkoseRenderStartTime);
					}

					if(renderData && renderData.arkoseRenderEndTime && !isNaN(renderData.arkoseRenderEndTime)){
						appendInputElementToForm( 'arkose_render_end_time_utc', renderData.arkoseRenderEndTime);
					}
					
					if(renderData && renderData.arkoseVerificationTime && !isNaN(renderData.arkoseVerificationTime)){
						appendInputElementToForm( 'arkose_verification_time_utc', renderData.arkoseVerificationTime);
					}

					if(renderData && renderData.arkoseError) {
						appendInputElementToForm('arkoseError', renderData.arkoseError);
					}
				}

				if(captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA && renderData){
					
					if(renderData && renderData.hcaptchaRenderStartTime && !isNaN(renderData.hcaptchaRenderStartTime)){
						appendInputElementToForm( 'hcaptcha_render_start_time_utc', renderData.hcaptchaRenderStartTime);
					}

					if(renderData && renderData.hcaptchaRenderEndTime && !isNaN(renderData.hcaptchaRenderEndTime)){
						appendInputElementToForm( 'hcaptcha_render_end_time_utc', renderData.hcaptchaRenderEndTime);
					}
					
					if(renderData && renderData.hcaptchaVerificationTime && !isNaN(renderData.hcaptchaVerificationTime)){
						appendInputElementToForm( 'hcaptcha_verification_time_utc', renderData.hcaptchaVerificationTime);
					}
				}

				if(captchaType === 'recaptcha' && renderData){
					
					if(renderData && renderData.grcRenderStartTime && !isNaN(renderData.grcRenderStartTime)){
						appendInputElementToForm( 'grc_render_start_time_utc', renderData.grcRenderStartTime);
					}

					if(renderData && renderData.grcRenderEndTime && !isNaN(renderData.grcRenderEndTime)){
						appendInputElementToForm( 'grc_render_end_time_utc', renderData.grcRenderEndTime);
					}
					
					if(renderData && renderData.grcVerificationTime && !isNaN(renderData.grcVerificationTime)){
						appendInputElementToForm( 'grc_verification_time_utc', renderData.grcVerificationTime);
					}
				}

				if(captchaType === ADS_FPTI.CAPTCHA_TYPE.GOOGLE_RECAPTCHAV3 && renderData) {
					if(renderData && renderData.grcRenderStartTime && !isNaN(renderData.timestamp)){
						appendInputElementToForm( 'refTimestamp', renderData.timestamp);
					}

					if(renderData && renderData.renderEndTime && !isNaN(renderData.renderEndTime)){
						appendInputElementToForm( 'grcV3RenderEndTime', renderData.renderEndTime);
					}
					
					if(renderData && renderData.renderStartTime && !isNaN(renderData.renderStartTime)){
						appendInputElementToForm( 'grcV3RenderStartTime', renderData.renderStartTime);
					}

					if(renderData && renderData.grcV3EntSiteKey && !isNaN(renderData.grcV3EntSiteKey)){
						appendInputElementToForm( 'publicKey', renderData.grcV3EntSiteKey);
					}
				}

				if(captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA_PASSIVE && renderData) {

					if(renderData && renderData.hcaptchaPassiveRenderEndTime && !isNaN(renderData.hcaptchaPassiveRenderEndTime)){
						appendInputElementToForm( 'hcaptcha_passive_render_end_time_utc', renderData.hcaptchaPassiveRenderEndTime);
					}
					
					if(renderData && renderData.hcaptchaPassiveRenderStartTime && !isNaN(renderData.hcaptchaPassiveRenderStartTime)){
						appendInputElementToForm( 'hcaptcha_passive_render_start_time_utc', renderData.hcaptchaPassiveRenderStartTime);
					}

					if(renderData && renderData.hcaptchaPassiveVerificationTime && !isNaN(renderData.hcaptchaPassiveVerificationTime)){
						appendInputElementToForm( 'hcaptcha_passive_verification_time_utc', renderData.hcaptchaPassiveVerificationTime);
					}
				}

				if (isInlineCaptcha) {
					return;
				}

				if (jsonCaptchaFlow) {
					document.getElementById("continue").click();
				} else {
					document.forms["challenge"].submit();
				}
			};
			if(captchaType === 'arkose'){
				ADS_FPTI.triggerADSClientSideFPTITracking({ captchaState: ADS_FPTI.STATES.ARKOSE_SERVED , isInlineCaptcha : isInlineCaptcha});
			} else if(captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA){
				ADS_FPTI.triggerADSClientSideFPTITracking({ captchaState: ADS_FPTI.STATES.HCAPTCHA_SERVED , isInlineCaptcha : isInlineCaptcha});
			} else if(captchaType === ADS_FPTI.CAPTCHA_TYPE.GOOGLE_RECAPTCHAV3) {
				ADS_FPTI.triggerADSClientSideFPTITracking({ captchaState: ADS_FPTI.STATES.RECAPTCHAV3_SERVED , isInlineCaptcha : isInlineCaptcha});
			} else if(captchaType === ADS_FPTI.CAPTCHA_TYPE.HCAPTCHA_PASSIVE) {
				ADS_FPTI.triggerADSClientSideFPTITracking({ captchaState: ADS_FPTI.STATES.HCAPTCHA_PASSIVE_SERVED , isInlineCaptcha : isInlineCaptcha});
			} else {
				ADS_FPTI.triggerADSClientSideFPTITracking({ captchaState: ADS_FPTI.STATES.RECAPTCHA_SERVED , isInlineCaptcha : isInlineCaptcha});
			}
			
			
			if (adsPluginDiv.getAttribute('data-view-type') === "webview") {
				var timeOutOp,
					pp_loc_map = {"ar_EG":"ar","da_DK":"da","de_DE":"de","de_DE_AT":"de-AT","de_DE_CH":"de-CH","en_AU":"en",
					"en_GB":"en-GB","en_US":"en","es_ES":"es","es_XC":"es-419","fr_CA":"fr-CA","fr_FR":"fr",
					"fr_XC":"fr","he_IL":"iw","id_ID":"id","it_IT":"it","ja_JP":"ja","ko_KR":"ko","nl_NL":"nl",
					"no_NO":"no","pl_PL":"pl","pt_BR":"pt-BR","pt_PT":"pt-PT","ru_RU":"ru","sv_SE":"sv","th_TH":"th",
					"tr_TR":"tr","zh_CN":"zh-CN","zh_HK":"zh-HK","zh_TW":"zh-TW","zh_XC":"zh-CN","ar":"ar","da":"da",
					"de":"de","en":"en","es":"es","fr":"fr","id":"id","ko":"ko","pt":"pt","ru":"ru","zh":"zh-CN"},
				showSpinner = function () {
					var transitioningDiv = document.getElementsByClassName('transitioning');
					if (transitioningDiv && transitioningDiv.length > 0) {
						transitioningDiv[0].className = 'transitioning spinner';
						transitioningDiv[0].setAttribute('aria-busy', 'true');
					}
				},
				hideSpinner = function () {
					var transitioningDiv = document.getElementsByClassName('transitioning');
					if (transitioningDiv && transitioningDiv.length > 0) {
						transitioningDiv[0].className = 'transitioning hide';
						transitioningDiv[0].removeAttribute('aria-busy');
					}
				},
				getGoogLocale = function (l,c){
					var loc_lower = l.toLowerCase();
					if(c !== undefined && (c.toLowerCase() === 'at' || c.toLowerCase() === 'ch') && (l === 'de_DE')) {
						l = l + '_' + c.toUpperCase();
					}
					if(loc_lower.indexOf('rowlite') !== -1 || loc_lower.indexOf('groupa') !== -1 || loc_lower.indexOf('groupb') !== -1 || loc_lower.indexOf('groupc') !== -1) {
						l = loc_lower.substring(0,2);
					}
					return pp_loc_map[l] || 'en';
				},
				checkConnection = function() {
					if (typeof grecaptcha === "undefined") {
						submitChallengeAnswer('NOT_REACHABLE');
					}
				},
				getGLocale = function() {
					var loc = adsPluginDiv.getAttribute('data-locale') || "";
					var country = adsPluginDiv.getAttribute('acCountry') || "";
					return getGoogLocale(loc, country);
				},
				getConnectionTimeout = function() {
					var connectionTimeout =  parseInt(adsPluginDiv.getAttribute('data-locale'));
					return isNaN(connectionTimeout) ? 5000 : connectionTimeout;
				}

				showSpinner();
				recaptchaCallback = function() {
					ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.RECAPTCHA_API_JS_LOADED , isInlineCaptcha : isInlineCaptcha});
					hideSpinner();
					try {
						grecaptcha.render('recaptcha', {
							'sitekey' : adsPluginDiv.getAttribute('data-sitekey') || '',
							'callback' : submitChallengeAnswer,
							'theme' : 'light',
							'size' : 'normal',
							'error-callback' : function() {
								submitChallengeAnswer('RENDER_FAILURE');
							}
						});
					} catch (e) {
						window.clearTimeout(timeOutOp);
						submitChallengeAnswer('RENDER_FAILURE');
					}
				};

				recaptchaEnterpriseCallback = function() {
					ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.RECAPTCHA_ENTERPRISE_API_JS_LOADED, isInlineCaptcha : isInlineCaptcha});
					hideSpinner();
					try {
						grecaptcha.enterprise.render('recaptcha', {
							'sitekey' : adsPluginDiv.getAttribute('data-sitekey') || '',
							'callback' : submitChallengeAnswer,
							'theme' : 'light',
							'size' : 'normal',
							'error-callback' : function() {
								submitChallengeAnswer('RENDER_FAILURE');
							}
						});
					} catch (e) {
						window.clearTimeout(timeOutOp);
						submitChallengeAnswer('RENDER_FAILURE');
					}
				};

				timeOutOp = window.setTimeout(checkConnection, getConnectionTimeout());

				var reCapcthaSource = document.createElement("script");

				reCapcthaSource.src = "https://www.recaptcha.net/recaptcha/enterprise.js?onload=recaptchaEnterpriseCallback&render=explicit&hl=" + getGLocale();
				
				document.getElementsByTagName("head")[0].appendChild(reCapcthaSource);

			} else if (!document.getElementById("captchaEventListenerAdded")) {
				var reCaptchaDivElem = document.createElement("div");
				reCaptchaDivElem.id = 'captchaEventListenerAdded';
				document.getElementsByTagName('html')[0].appendChild(reCaptchaDivElem);

				var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
				var removeMethod = window.removeEventListener ? "removeEventListener" : "detachEvent";
				var eventer = window[eventMethod];
				var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";


				eventer(messageEvent,function messageListeners(event) {

					if(event.data === ADS_FPTI.STATES.RECAPTCHA_API_JS_LOADED) {
						ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.RECAPTCHA_API_JS_LOADED, isInlineCaptcha : isInlineCaptcha});
						return;
					}

					if(event.data === ADS_FPTI.STATES.RECAPTCHA_ENTERPRISE_API_JS_LOADED) {
						ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.RECAPTCHA_ENTERPRISE_API_JS_LOADED, isInlineCaptcha : isInlineCaptcha});
						return;
					}

					var message;
					// Parse the event data into JSON
					try {
						message = JSON.parse(event.data);
					} catch (e) {
						ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: getClientParseMessage(), 
							message: "Client side message parse failed," + JSON.stringify(event.data)+
							", origin : "+event.origin});
						
						return;
					}

					if(message.source === 'adframe') {
						submitGRCV3(message);
					}

					if (message.source !== 'recaptchav2iframe' && message.source !== 'arkoseiframe' && message.source !== 'hcaptchaiframe' && message.source !== 'evalRecaptchav3' && message.source !== 'hCaptchaPassiveEval') {
						// TODO:: Do an FPTI log
						return;
					}

					if(message.log) {
						ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: message.captchaState, isInlineCaptcha : isInlineCaptcha});
						return;
					}


					if(message.hasOwnProperty('frameHeight')){
						if(document.getElementById("frameRecaptcha")){
							document.getElementById("frameRecaptcha").style.height = message.frameHeight;
						}
						return;
					}

					if (message.hasOwnProperty('token')) {
						submitChallengeAnswer(message.token || 'EMPTY_TOKEN',message.renderData);
					}
					
					window[removeMethod](messageEvent,messageListeners);
					document.getElementById("captchaEventListenerAdded").remove();
					
				},false);
			}
		}else{
			if (isInlineCaptcha && inlineCaptchaForm && window.ppcaptcha) {
				window.ppcaptcha.adsCaptcha && window.ppcaptcha.adsCaptcha.render();
				validateChallengeInput = function () {
					if (window.ppcaptcha.errorDisplay &&
							window.ppcaptcha.errorDisplay.verifyForm) {
						return window.ppcaptcha.errorDisplay.verifyForm(inlineCaptchaForm);
					}
					return true;
				}
			};

			if(captchaType === 'captcha'){
				appendInputElementToForm( 'captcha_render_start_time_utc', new Date().getTime());
			}

			ADS_FPTI.triggerADSClientSideFPTITracking({captchaState: ADS_FPTI.STATES.PPCAPTCHA_SERVED , isInlineCaptcha : isInlineCaptcha});
		}

		window.validateChallengeInput = validateChallengeInput;
        notifyInterceptor();
    }
})();

(function (arr) {
	arr.forEach(function (item) {
	  if (item.hasOwnProperty('remove')) {
		return;
	  }
	  Object.defineProperty(item, 'remove', {
		configurable: true,
		enumerable: true,
		writable: true,
		value: function remove() {
		  if (this.parentNode === null) {
			return;
		  }
		  this.parentNode.removeChild(this);
		}
	  });
	});
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);