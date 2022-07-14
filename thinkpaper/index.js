const db = firebase.database();
const SELECTBOX_BPTITLE_VALUE_INIT = "INIT";

let userData = {};
let objectById = {};
let isMainShown = false;

(function() {
	logIn();
})();

///// logIn manager

function logIn() {
	firebase.auth().onAuthStateChanged(function (user) {
		if (user != null) {
			requestReadUserData(user);
			requestReadBigPicture(user);
			openEditCardByDbclick();
		} else {
			window.location.replace("login.html");
		};
	});
};

function logOut() {
	firebase.auth().signOut();
};

///// StoL manager

function requestReadUserData(user) {
	const userRef = db.ref("users").child(user.uid).child("user");
	userRef.on("value", (snapshot) => {
		snapshot.forEach(childSnap => {
			let key = childSnap.key;
			let value = childSnap.val();
			value["uid"] = childSnap.key;
			userData[key] = value;
		});
		showUserData(userData);
	});
};

function requestReadIdAndObjectFromChildren(o){
	// console.log('**requestReadIdAndObjectFromChildren >>',o)
	const c = o.children
	if(!c) return;

	const ids = Object.keys(c)
	if(ids.length == undefined) return;

	ids.forEach( id => {
		const v = c[id]
		objectById[id] = v
		requestReadIdAndObjectFromChildren(v)
	});
	
};

function requestReadBigPicture(user) {

	const userRef = db.ref("users").child(user.uid).child("bigPicture");
	
	userRef.on("value", (snapshot) => {
		console.log("**===== .on is here =====");

		const v = snapshot.val();
		console.log("v =", v);
		objectById = {};
		requestReadIdAndObjectFromChildren(v);
		// console.log('**objectById >>',objectById)

		function showItOnUI_latest() {

			let idThreadObjectKeysArray = ["character", "direction"];
			// 리팩토링 후 "roadmap", "actionPlan" 넣기
	
			function getLatestIdByLayer(layerHere) {
				let eachIdArrayByLayer = getEveryIdArrayOfLayer(layerHere);
				if(eachIdArrayByLayer.length > 0){
					let latestId = getLastestEditedId(eachIdArrayByLayer);
					console.log("latest =", layerHere, "|", latestId, "| value =", objectById[latestId].contents[layerHere]);
					return latestId;
				} else {
					return null;
				};
			};

			idThreadObjectKeysArray.forEach(EachLayer => {
				let latestIdOfEachLayer = getLatestIdByLayer(EachLayer);
				if(latestIdOfEachLayer != null) {

					let mainId = getMainId();
				
					if(mainId != null && isMainShown == false) {
						isMainShown = true;
						showItOnUI("character", mainId);
					} else {
						showItOnUI(EachLayer, latestIdOfEachLayer);
					};
					setupBtnShowOrHideByClassName(EachLayer, "readCard");
					updateSelectbox(EachLayer);

				} else {
					showItIfNoBpData(EachLayer);
				};
			});
		};

		showItOnUI_latest();

	});
};

///// LtoS manager

function requestSetCard(layerHere, packagedDataHere) {
	const inputId = packagedDataHere.id;
	const switchedRef = getRefBySwitchLayer(inputId, layerHere);
	switchedRef.child(inputId).set(packagedDataHere, (e) => {alert("저장되었습니다.");});
	request_followUpEditedDate(layerHere, packagedDataHere);
};

function requestUpdateCard(layerHere, packagedDataHere) {
	const inputId = packagedDataHere.id;
	const switchedRef = getRefBySwitchLayer(inputId, layerHere);
	switchedRef.child(inputId).update(packagedDataHere, (e) => {
		console.log("** update completed = ", e);
		});
	request_followUpEditedDate(layerHere, packagedDataHere);
};

function request_followUpEditedDate(layerHere, packagedDataHere) {

	const inputId = packagedDataHere.id;
	const switchedRef = getRefBySwitchLayer(inputId, layerHere);
	const switchedRefForEmptyData = switchedRef.parent;
	const editedDateForParents = {"editedDate": packagedDataHere.editedDate};
		
	function requestUpdateEditedDate(layer1, layer2, layer3, layer4) {
	
		let idThreadObjectKeysArray = [layer1, layer2, layer3, layer4];
	
		idThreadObjectKeysArray.forEach(eachLayer => {
			if (eachLayer != undefined) {
				console.log("request_followUpEditedDate test");
				switchedRefForEmptyData.update(editedDateForParents, (e) => {
				// [시도하기] *문서 확인하기
				console.log("** update completed = ", e);
				});
			};
		});
	};
	switch(layerHere) {
		case "character" :
			// 해당없음
			break;
		case "direction" :
			requestUpdateEditedDate("character");
			break;
		case "roadmap" :
			requestUpdateEditedDate("character", "direction");
		case "actionPlan" :
			requestUpdateEditedDate("character", "direction", "roadmap");
			// 리팩토링 후 "roadmap", "actionPlan" 넣기
		default : null;
	};
};

function requestRemoveCard(layerHere, idHere) {
	const inputId = idHere;
	const switchedRef = getRefBySwitchLayer(inputId, layerHere);
	const idArrayLength = getEveryIdArrayOfLayer(layerHere).length;
	if(idArrayLength != 1){
		console.log("test @requestRemoveCard");
		switchedRef.child(inputId).remove((e) => {
			console.log("** remove completed = ", e);
			});
	} else {
		let emptyData = {children: ""};
		console.log("requestRemoveCard test");
		const switchedRefForEmptyData = switchedRef.parent;
		switchedRefForEmptyData.set(emptyData);
	};
	// location.reload();
};
	

function requestUpdateMainCard(idHere) {
	
	const characterIdArray = getEveryIdArrayOfLayer("character");

	characterIdArray.forEach(eachId => {

		let setMainValue = {};

		if (eachId == idHere) {
			setMainValue = {
				"main": "main",
				"editedDate": getTimeStamp()
			};
		} else {
			setMainValue = {
				"main": ""
			};
		};

		db.ref("users")
		.child(userData.uid)
		.child("bigPicture")
		.child("children")
		.child(eachId)
		.update(setMainValue, (e) => {
			console.log("** update completed = ", e);
			});

	});
	
};

function getRefBySwitchLayer(inputIdHere, layerHere) {

	console.log("**=====getRefBySwitchLayer() start=====");

	const userRef = db.ref("users").child(userData.uid);
	const bigPictureRef = userRef.child("bigPicture");
	const characterRef = bigPictureRef.child("children");

	let resultIsNewId = isNewId(inputIdHere);

	if (resultIsNewId) {

		switch(layerHere){
			case "character" :
				return characterRef;
			case "direction" : 
				let characterId = getParentsIdfromChildId("direction", inputIdHere);
				// [시도] 여기있는 모든 let을 const로 하면 안되는가?
				console.log("characterId = ", characterId);
				let directionRef = characterRef.child(characterId).child("children");
				return directionRef;
			case "roadmap" : 
				let directionId = getCardId("direction");
				let roadmapRef = directionRef.child(directionId).child("children");
				return roadmapRef;
			case "actionPlan" : 
				let roadmapId = getCardId("roadmap");
				let actionPlanRef = roadmapRef.child(roadmapId).child("children");
				return actionPlanRef;
			default: 
				return null;
		};

	} else {

		const idThreadObject = getIdThreadObjectById(inputIdHere);
		const layer = objectById[idHere].layer;

		const directionRef = characterRef[getParentsIdfromChildId("character", idThreadObject.characterId)].child("children");
		const roadmapRef = directionRef[getParentsIdfromChildId("direction", idThreadObject.directionId)].child("children");
		const actionPlanRef = roadmapRef[getParentsIdfromChildId("roadmap", idThreadObject.roadmapId)].child("children");

		switch(layer){
			case "character" : 
				return characterRef;
			case "direction" : 
				return directionRef;
			case "roadmap" : 
				return roadmapRef;
			case "actionPlan" : 
				return actionPlanRef;
			default: 
				return null;
		};
	};
};

///// user data manager

function showUserData(userDataHere) {
	const userName = userDataHere.name;
	const userEmail = userDataHere.email;
	getSelectorById("nameChecked").innerHTML = "방문자: " + userName + " 대표";
	getSelectorById("emailChecked").innerHTML = "(" + userEmail + ")"+"		";
};

///// local data manager

function packageNewCard(layerHere) {

	let moniterResult = monitorCardBlankOrDuplicates(layerHere);

	if (moniterResult == true) {

		function catchValueBySwitchLayer(layerHere2) {

			let packagedData = {};
			packagedData["contents"] = {};
			let contents = packagedData["contents"];
		
			switch(layerHere2){
				case "character" :
					packagedData["parentsId"] = "";
					contents["character"] = getSelectorById("character").value.trim();
					break;
				case "direction" :
					packagedData["parentsId"] = getCardId("character");
					contents["direction"] = getSelectorById("direction").value.trim();
					break;
				case "roadmap" :
					packagedData["parentsId"] = getCardId("direction");
					contents["roadmapArea"] = getSelectorById("roadmapArea").value.trim();
					contents["roadmapA"] = getSelectorById("roadmapA").value.trim();
					contents["roadmapB"] = getSelectorById("roadmapArea").value.trim();
					break;
				case "actionPlan" :
					packagedData["parentsId"] = getCardId("roadmap");
					contents["actionPlan"] = getSelectorById("actionPlan").value.trim();
					break;
				default:
					let layerHere2 = null;
			};
			return packagedData;
		};

		let packagedData = catchValueBySwitchLayer(layerHere);

		function getUuidv4() {
			return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			  (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
			);
		};

		let idNew = getUuidv4();
		packagedData["id"] = idNew;
		packagedData["children"] = "";
		packagedData["createdDate"] = getTimeStamp();
		packagedData["editedDate"] = getTimeStamp();
		packagedData["main"] = "";
		packagedData["layer"] = layerHere;
		return packagedData;
	};
		
};

function packageEditedCard(layerHere) {

	function moniterIfCardChanged(layerHere2) {

		// 현재 UI에 띄워진 값 포착하기
		let id = getSelectorById("cardId_"+layerHere2).value;
		let value = getSelectorById(layerHere2).value.trim();
		let object = {"id": id, [layerHere2]: value};

		// 로컬 데이터에 있는 값 포착하기

		function getMappedObject_IdContents(layerHere2) {		

			let returnArray = [];
	
			let eachIdArrayByLayer = getEveryIdArrayOfLayer(layerHere2);
			eachIdArrayByLayer.forEach(EachId => {
				let returnObject = {};
				returnObject["id"] = objectById[EachId].id;
				returnObject[layerHere2] = objectById[EachId].contents[layerHere2];
				returnArray.push(returnObject);
			});
	
			return returnArray;
		};

		let arrayWithId = getMappedObject_IdContents(layerHere);
		// let arrayWithId = getIdArrayByMap(layerHere, "contents", layerHere);
	
		// 위 두가지가 같은 경우의 수라면, 수정이 이뤄지지 않은 상태
		for(let i = 0; i < arrayWithId.length; i++) {
			if(JSON.stringify(object) === JSON.stringify(arrayWithId[i])) {
				return false;
			};
		};
		return true;
	};
	
	function getMoniterResult(layerHere3, isChanged) {
		if (isChanged == true) {
			let moniterResultInFunction = monitorCardBlankOrDuplicates(layerHere3);
			return moniterResultInFunction;
		} else {
			return true;
		};
	};

	let moniterResult = getMoniterResult(layerHere, moniterIfCardChanged(layerHere));
	
	if (moniterResult == true) {
		let packagedData = {};
		packagedData["id"] = getCardId(layerHere);
		packagedData["parentsId"] = getSelectorById("cardParentsId_"+layerHere).value;
		packagedData["editedDate"] = getTimeStamp();
		packagedData["contents"] = {};

		let contents = packagedData["contents"];
		switch(layerHere){
			case "character" :
				contents["character"] = getSelectorById("character").value.trim();
				break;
			case "direction" :
				contents["direction"] = getSelectorById("direction").value.trim();
				break;
			case "roadmap" :
				contents["roadmapArea"] = getSelectorById("roadmapArea").value.trim();
				contents["roadmapA"] = getSelectorById("roadmapA").value.trim();
				contents["roadmapB"] = getSelectorById("roadmapArea").value.trim();
				break;
			case "actionPlan" :
				contents["actionPlan"] = getSelectorById("actionPlan").value.trim();
				break;
			default: 
				let layer = null;
		};
		return packagedData;
	};
};

///// UI manager

function showEmptyCard(layerHere) {
	getSelectorById(layerHere).value = "";
	setupBtnShowOrHideByClassName(layerHere,"createFirstCard");
};

function showItOnUI(layerHere, idHere) {
	if (idHere != null) {
		getSelectorById(layerHere).value = objectById[idHere].contents[layerHere];
		getSelectorById("cardId_"+layerHere).value = objectById[idHere].id;
		getSelectorById("cardParentsId_"+layerHere).value = objectById[idHere].parentsId;
	} else {
		console.log("Id = null @showItOnUI");
		getSelectorById(layerHere).value = "";
	};
	setupBtnShowOrHideByClassName(layerHere,"readCard");
};

function showItOnUI_followUp(layerHere) {
	function showItOnUI_latest_byLayerCondition(layer1, layer2, layer3, layer4) {
	
		let idThreadObjectKeysArray = [layer1, layer2, layer3, layer4];
	
		function getLatestIdByLayer(layerHere) {
			let eachIdArrayByLayer = getEveryIdArrayOfLayer(layerHere);
			if(eachIdArrayByLayer.length > 0){
				let latestId = getLastestEditedId(eachIdArrayByLayer);
				return latestId;
			} else {
				return null;
			};
		};
	
		idThreadObjectKeysArray.forEach(eachLayer => {
			if (eachLayer != undefined) {
				let latestIdOfEachLayer = getLatestIdByLayer(eachLayer);
				if(latestIdOfEachLayer != null) {
					showItOnUI(eachLayer, latestIdOfEachLayer);
					setupBtnShowOrHideByClassName(eachLayer, "readCard");
				} else {
					showItIfNoBpData(eachLayer);
				};
				updateSelectbox(eachLayer);
			};
		});
	};
	
	switch(layerHere) {
		case "character" :
			showItOnUI_latest_byLayerCondition("direction");
			// 리팩토링 후 "roadmap", "actionPlan" 넣기
			break;
		case "direction" :
			// showItOnUI_latest_byLayerCondition("roadmap", "actionPlan");
			break;
		case "roadmap" :
			showItOnUI_latest_byLayerCondition("actionPlan");
		case "actionPlan" :
			// 해당없음
		default : null;
	};
};

function hideUI(id) {
	getSelectorById(id).style.display = "none";
};

function showUI(id) {
	getSelectorById(id).style.display = "initial";
};

function setupBtnShowOrHideByClassName(className, state) {

	hideUI("openEditCard_btn_"+className);
	hideUI("cancelEditCard_btn_"+className);
	hideUI("saveEditedCard_btn_"+className);
	hideUI("saveNewCard_btn_"+className);
	hideUI("removeCard_btn_"+className);
	hideUI("openNewCard_btn_"+className);

	switch(state){
		case "createFirstCard" :
			showUI("saveNewCard_btn_"+className);
			setupEditModeByClassName(className, "editing");
			break;
		case "openNewCard" :
			showUI("saveNewCard_btn_"+className);
			showUI("cancelEditCard_btn_"+className)
			setupEditModeByClassName(className, "editing");
			break;
		case "readCard" :
			hideUI("guideMessage");
			showUI("openEditCard_btn_"+className);
			showUI("openNewCard_btn_"+className);
			showUI("removeCard_btn_"+className);
			setupEditModeByClassName(className, "reading");
			break;
		case "editCard" :
			showUI("saveEditedCard_btn_"+className);
			showUI("cancelEditCard_btn_"+className);
			showUI("saveNewCard_btn_"+className);
			showUI("removeCard_btn_"+className);
			setupEditModeByClassName(className, "editing");
			break;
		default:
			let state = null;
	}
	if(className == "character") {
		setupBtnShowOrHideByClassName_main(className, state);
	};
	resizeTextarea();
};

function setupBtnShowOrHideByClassName_main(className) {
	hideUI("gotoMainCard_btn_"+className);
	hideUI("setMainCard_btn_"+className);
	hideUI("setMainCard_txt_"+className);

	let cardId = getSelectorById("cardId_character").value;
	let mainId = getMainId();

	if(cardId == mainId) {
		showUI("setMainCard_txt_"+className);
	} else {
		if (mainId != null) {
			showUI("gotoMainCard_btn_"+className);
			showUI("setMainCard_btn_"+className);
		} else {
			showUI("setMainCard_btn_"+className);
		};
	};
};

function setupEditModeByClassName(className, cardMode) {
	function textareaReadOnly(id, check){
		getSelectorById(id).readOnly = check;
	};
	if (cardMode == "editing") {
		document.getElementsByClassName(className)[0].style.color = "#9CC0E7";
		document.getElementsByClassName(className)[0].style.borderColor = "#9CC0E7";
		setupTextareaBorderColorByClass(className, "3px", "#9CC0E7");
		textareaReadOnly(className, false);
	} else {
		document.getElementsByClassName(className)[0].style.color = "#424242";
		document.getElementsByClassName(className)[0].style.borderColor = "#424242";
		setupTextareaBorderColorByClass(className, "1px", "#c8c8c8");
		textareaReadOnly(className, true);
	};
};

function setupTextareaBorderColorByClass(className, px, color) {
    setTimeout(()=>{
		const selectorTextareaOnCard = document.getElementsByClassName(className);
		for (let i = 0; i < selectorTextareaOnCard.length; i++) {
			selectorTextareaOnCard[i].style.border = "solid " + px + color;
		};
	},1);
};

function resizeTextarea() {
	// 참고: https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
	const tx = document.getElementsByTagName("textarea");
	for (let i = 0; i < tx.length; i++) {
		tx[i].setAttribute("style", "height:" + (tx[i].scrollHeight) + "px;overflow-y:hidden;");
		tx[i].addEventListener("input", OnInput, false);
	};

	function OnInput() {
		this.style.height = "auto";
		this.style.height = (this.scrollHeight) + "px";
	};
};

function showItIfNoBpData(layerHere) {
	showEmptyCard(layerHere);
	let guideMessage = getSelectorById("guideMessage").innerHTML;
	if (guideMessage == "") {
		guideMessage = "'파란색으로 쓰여진 곳의 네모칸에 내용을 작성해보세요~!'"
	};
};

function highLightBorder(id, color) {
	return getSelectorById(id).style.borderColor = color;
};

///// selectbox manager

function updateSelectbox(layerHere) {

	let selectboxId = "selectbox_"+layerHere;
	let selectbox = getSelectorById(selectboxId);

	// selectbox 초기화하기
	for (let i = selectbox.options.length - 1; i >= 0; i--) {
		selectbox.remove(i + 1);
	};

	// Array 만들기

	function getMappedObject_IdEditedDateContents(layerHere3) {		

		let returnArray = [];

		let eachIdArrayByLayer = getEveryIdArrayOfLayer(layerHere3);
		eachIdArrayByLayer.forEach(EachId => {
			let returnObject = {};
			returnObject["id"] = objectById[EachId].id;
			returnObject["editedDate"] = objectById[EachId].editedDate;
			returnObject[layerHere3] = objectById[EachId].contents[layerHere3];
			returnArray.push(returnObject);
		});

		return returnArray;
	};

	let mappedArray = getMappedObject_IdEditedDateContents(layerHere);

	// selectbox option list 순서 잡기(최근 편집 순서)
	function sortingArray(mappedArrayHere){
		mappedArrayHere.sort(
			(a,b) => new Date(b.editedDate) - new Date(a.editedDate)
		);
		return mappedArrayHere;
	};

	let sortedArray = sortingArray(mappedArray);
	console.log(layerHere, "|", sortedArray);

	// <option> 만들어서, Array 넣기
	for (let i = 0; i < sortedArray.length; i++) {
		let option = document.createElement("OPTION");
		let txt = document.createTextNode(sortedArray[i][layerHere]);
		let optionId = sortedArray[i].id;
		let optionValue = sortedArray[i][layerHere];
		let mainId = getMainId();
		if(optionId == mainId) {
			let mainOptionMark = optionValue + " ★";
			let mainTxt = document.createTextNode(mainOptionMark);
			option.appendChild(mainTxt);
		} else {
			option.appendChild(txt);
		};
		option.setAttribute("value", sortedArray[i].id);
		option.setAttribute("innerHTML", sortedArray[i][layerHere]);
		selectbox.insertBefore(option, selectbox.lastChild);
	};
};

function selectBySelectbox(layerHere) {
	let selectboxId = "selectbox_"+layerHere;
	let id = getSelectorById(selectboxId).value;
	console.log("id =", id);
	if(id != SELECTBOX_BPTITLE_VALUE_INIT) {
		showItOnUI(layerHere, id);
		showItOnUI_followUp(layerHere);
		
	};
};



///// mainCard mananger

function setMainCard() {
	let characterId = getSelectorById("cardId_character").value;
	requestUpdateMainCard(characterId);
};

function gotoMainCard() {
	let mainId = getMainId();
	showItOnUI("character", mainId);
	updateSelectbox("character");
};

function getMainId() {
	let characterIdArray = getEveryIdArrayOfLayer("character");
	let mainId = "";
	characterIdArray.forEach(eachId => {
		// console.log("objectById[eachId].main =", objectById[eachId].main);
		if(objectById[eachId].main == "main") {
			mainId = eachId;
		};
	});
	if (mainId != ""){
		return mainId;
	} else {
		return null;
	};
};

///// CRUD manager

function saveNewCard(layerHere) {
	let packagedBpData = packageNewCard(layerHere);
	if (packagedBpData != null) {
		requestSetCard(layerHere, packagedBpData);
		showItOnUI_followUp(layerHere);
		
	};
};

function saveEditedCard(layerHere) {
	let packagedData = packageEditedCard(layerHere);
	if (packagedData != null) {
		console.log("packagedData =", packagedData);
		requestUpdateCard(layerHere, packagedData);
		alert("저장되었습니다.");
	};
};

function removeCard(layerHere) {
	let removeId = getSelectorById("cardId_"+layerHere).value;
	if (confirm("정말 삭제하시겠습니까? 삭제가 완료되면, 해당 내용은 다시 복구될 수 없습니다.")) {
		requestRemoveCard(layerHere,removeId);
		alert("삭제되었습니다.");
	};
};

function openNewCard(layerHere) {
	showEmptyCard(layerHere);
	setupBtnShowOrHideByClassName(layerHere,"openNewCard");

	function openNewCard_followUp(layerHere) {
		function openNewCard_byLayerCondition(layer1, layer2, layer3, layer4) {
		
			let idThreadObjectKeysArray = [layer1, layer2, layer3, layer4];
		
			idThreadObjectKeysArray.forEach(eachLayer => {
				if (eachLayer != undefined) {
					showEmptyCard(layerHere);
					setupBtnShowOrHideByClassName(layerHere,"openNewCard");
				};
			});
		};
		
		switch(layerHere) {
			case "character" :
				openNewCard_byLayerCondition("direction");
				// 리팩토링 후 "roadmap", "actionPlan" 넣기
				break;
			case "direction" :
				// openNewCard_byLayerCondition("roadmap", "actionPlan");
				break;
			case "roadmap" :
				openNewCard_byLayerCondition("actionPlan");
			case "actionPlan" :
				// 해당없음
			default : null;
		};
	};
	openNewCard_followUp(layerHere);
	//확인 필요
};

function openEditCardByDbclick() {
	const textareaOnCard = document.getElementsByTagName("textarea");
	for (let i = 0; i < textareaOnCard.length; i++) {
		textareaOnCard[i].addEventListener("dblclick", function (e) {
			const layer = e.target.id;
			const idArray = getEveryIdArrayOfLayer(layer);
			if(idArray.length > 0){
				openEditCard(layer);
			};
		});
	};
};

function openEditCard(layerHere) {
	console.log("test");
	setupBtnShowOrHideByClassName(layerHere,"editCard");
};

function cancelEditCard(layerHere) {
	let cardId = getSelectorById("cardId_"+layerHere).value;
	showItOnUI(layerHere, cardId);
};

///// monitor manager

function monitorCardBlankOrDuplicates(layerHere) {
	let cardValue = getSelectorById(layerHere).value.trim();
	if (cardValue != "") {

		function getSameTextArray(layerHere2, cardValueHere) {

			const idArray = getEveryIdArrayOfLayer(layerHere2);

			let mappedIdArray = idArray.map( id => {
				let mappingObject = {"id":id};
				mappingObject[layerHere2] = objectById[id].contents[layerHere2];	
				return mappingObject;
				});
		
			let valueArray = [];
			for(let i = 0; i < mappedIdArray.length; i++) {
				valueArray.push(mappedIdArray[i][layerHere2]);
			};
		
			let filterSameTextArray = (query) => {
				return valueArray.find(value => query == value);
			}; //문법 형태의 이해

			// function filterSameTextArray(query) {
			// 	return valueArray.find(value => query == value);
			// }; //한번더 보기
		
			let sameTextArray = filterSameTextArray(cardValueHere);
		
			return sameTextArray;
		};

		let sameTextArray = getSameTextArray(layerHere, cardValue);
		if (sameTextArray == undefined) {
			return true;
		} else {
			highLightBorder(layerHere, "red");
			alert("중복된 카드가 있습니다. 내용을 수정해주시기 바랍니다.");
		};
	} else {
		highLightBorder(layerHere, "red");
		alert("카드가 비어있습니다. 내용을 입력해주시기 바랍니다.");
	};
	return false;
};

///// general supporter

function getSelectorById(id) {
	return document.getElementById(id);
};

function getTimeStamp() {
	let now = new Date();
	let nowString = now.toISOString();
	return nowString;
};

function getCardId(layerHere) {
	let result = getSelectorById("cardId_"+layerHere).value;
	return result;
};

function getLastestEditedId(keysArrayHere) {

	const mappedArray = keysArrayHere.map( id => {
		let c = objectById[id];
		return {"id": id, "editedDate": c.editedDate};
	}).sort(
		(a,b) => new Date(b.editedDate) - new Date(a.editedDate)
	);

	if (mappedArray != null) {
		let latestEditedId = mappedArray[0];
		return latestEditedId.id;
	} else {
		return null;
	};

};

function copyAndPast() {
	//자주 쓰는 텍스트의 복붙을 위한 자료, 의미없는 함수
	switch(layerHere) {
		case "character" :
		case "direction" :
		case "roadmap" :
		case "actionPlan" :
		default :
	};
}

// id manager
// **id manager에서는 필요한 id값을 가져온다.
// **id 값은 대표적으로 parentsId, idTread로 해당한다.

function getParentsIdfromChildId(layerHere, childIdHere) {
	console.log("**=====getParentsIdfromChildId start=====");

	console.log("layerHere =", layerHere);
	console.log("childIdHere =", childIdHere);

	let everyIdArray = getEveryIdArrayOfLayer(layerHere);
	let parentsId = "";

	if(layerHere == "character") {
		parentsId = "bigPicture";
		return parentsId;
	} else {
		for(let i = 0; i < everyIdArray.length; i++) {
			if(everyIdArray[i] == childIdHere) {
				parentsId = objectById[childIdHere].parentsId;
				return parentsId;
			};
		};
		parentsId = getCardId(getParentsLayerBySwitchLayer(layerHere));
		// [다시 시도] 신규 id가 떴을 때, 어떤 레이어인지 알 수 있는 방법
		return parentsId;
	};
};

function getIdThreadObjectById(inputIdhere) {
	
	let resultIsNewId = isNewId(inputIdhere);
	// *console.log("resultIsNewId = ", resultIsNewId);
	let returnObject = {};

	if (resultIsNewId) {
		// console.log("true");
		// [전체 다시 보기] Boolean으로 하면 왜 false로 가는가?
		returnObject["characterId"] = getCardId("character");
		returnObject["directionId"] = getCardId("direction");
		// returnObject["roadmapId"] = getCardId("raodmap");
		// returnObject["actionPlanId"] = getCardId("actionPlan");
		return returnObject;
	} else {
		// console.log("false");
		let unitObject = objectById[inputIdhere];
		let inputLayer = unitObject.layer;

		function getIdBySwitchLayer(layerHere) {
			let returnObject = {};
			switch(layerHere){
				case "character" : 
					returnObject["characterId"] = inputIdhere;
					returnObject["directionId"] = "";
					returnObject["roadmapId"] = "";
					returnObject["actionPlanId"] = "";
					break;
				case "direction" :
					returnObject["characterId"] = getParentsIdfromChildId("character", inputIdhere);
					returnObject["directionId"] = inputIdhere;
					returnObject["roadmapId"] = "";
					returnObject["actionPlanId"] = "";
					break;
				case "roadmap" :
					let directionId = getParentsIdfromChildId("direction", inputIdhere);
					let characterId = getParentsIdfromChildId("character", directionId);
					returnObject["characterId"] = characterId;
					returnObject["directionId"] = directionId;
					returnObject["roadmapId"] = inputIdhere;
					returnObject["actionPlanId"] = "";
					break;
				case "actionPlan" :
					let roadmapId = getParentsIdfromChildId("roadmap", inputIdhere);
					let direcitonId2 = getParentsIdfromChildId("direction", roadmapId);
					let characterId2 = getParentsIdfromChildId("character", direcitonId2);
					returnObject["characterId"] = characterId2;
					returnObject["directionId"] = direcitonId2;
					returnObject["roadmapId"] = roadmapId;
					returnObject["actionPlanId"] = inputIdhere;
					break;
				default: null;	
			};
			return returnObject;
		};
		
		returnObject = getIdBySwitchLayer(inputLayer);
		console.log("returnObject =", returnObject);
		return returnObject;
	};
};

function getEveryIdArrayOfLayer(layerHere) {
	let everyIdArray = Object.keys(objectById);
	let everyIdArrayOfLayer = [];
	
	for(let i = 0; i < everyIdArray.length; i++) {
		if(objectById[everyIdArray[i]].layer == layerHere ) {
			everyIdArrayOfLayer.push(everyIdArray[i]);
		};
	};

	// character 레이어를 제외하고, 부모에 해당하는 것들 중에서만 중복을 검토하기
	if(layerHere != "character") {
		let everyIdArrayOfLayerFromSameParents = [];
		for(let j = 0; j < everyIdArrayOfLayer.length; j++) {
			let parentsLayer = getParentsLayerBySwitchLayer(layerHere);
			if (objectById[everyIdArrayOfLayer[j]].parentsId == getCardId(parentsLayer)){
				everyIdArrayOfLayerFromSameParents.push(everyIdArrayOfLayer[j]);
			};
		};
		return everyIdArrayOfLayerFromSameParents;
	};
	
	return everyIdArrayOfLayer;
};

function isNewId(idHere) {
	let everyIdArray = Object.keys(objectById);
	let checkpoint = everyIdArray.includes(idHere);
	if (checkpoint) {
		return false;
	} else {
		return true;
	};
};

// switch manager
// switch 기능이 필요할때 작용한다.

function getParentsLayerBySwitchLayer(layerHere) {
	switch(layerHere){
		case "character" : 
			return null;
		case "direction" :
			return "character";
		case "roadmap" :
			return "direction";
		case "actionPlan" :
			return "roadmap";
		default : return null; 
	};
};