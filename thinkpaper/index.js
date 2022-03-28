// const firebase = appFireBase;
// [질문] 위 내용이 없으면 어떻게되는가? fireBase.js 연관 생각

const db = firebase.database();
let userInfoData = {};
let bpData = {};
let currentBpData = {};

logIn();

// *** logIn 관리를 위한 함수 세트
function logIn() {
	firebase.auth().onAuthStateChanged(function (user) {
		if (user != null) {
			requestUserInfoData(user);
			requestBpData(user);
		} else {
			window.location.replace("login.html");
		};
	});
}; // checked!

function logOut() {
	firebase.auth().signOut();
}; // checked!

// *** user에 대한 상태 판단
function isWebReloaded() {
	
	// // 참고: https://stackoverflow.com/questions/5004978/check-if-page-gets-reloaded-or-refreshed-in-javascript
	// const pageAccessedByReload = (
	// 	(window.performance.navigation && window.performance.navigation.type === 1) ||
	// 	  window.performance
	// 		.getEntriesByType('navigation')
	// 		.map((nav) => nav.type)
	// 		.includes('reload')
	//   );
	// return pageAccessedByReload;
}; // checked!

	// [향후 개선하기] 더블클릭시 작성모드로 설정되기
	// [버그] direction에 있는 textarea만 선택이 되고 있음
	// const card = document.querySelector("textarea");

	// card.addEventListener("dblclick", function (e) {
	// 	openEditPaper();
	// });

function editModeHandler(paperMode) {
	function textareaReadOnly(id, check){
		selectorById(id).readOnly = check;
	};
	if (paperMode == "editing") {
		selectorById("divPaperMode").innerHTML = "작성모드";
		selectorById("gridMainFrame").style.color = "#9CC0E7";
		textareaReadOnly("bpTitle", false);
		textareaReadOnly("direction", false);
		textareaReadOnly("naviArea", false);
		textareaReadOnly("naviB", false);
		textareaReadOnly("naviA", false);
		textareaReadOnly("actionPlan", false);
	} else {
		selectorById("divPaperMode").innerHTML = "읽기모드";
		selectorById("gridMainFrame").style.color = "#424242";
		textareaReadOnly("bpTitle", true);
		textareaReadOnly("direction", true);
		textareaReadOnly("naviArea", true);
		textareaReadOnly("naviB", true);
		textareaReadOnly("naviA", true);
		textareaReadOnly("actionPlan", true);
	};
}; // checked!

// *** userInfoData 오브젝트 관리를 위한 함수 세트
function requestUserInfoData(user) {
	const userRef = db.ref("users").child(user.uid);
	userRef.on("value", (snapshot) => {
		snapshot.forEach(childSnap => {
			let key = childSnap.key;
			let value = childSnap.val();
			value["uid"] = childSnap.key;
			userInfoData[key] = value;
		});
		printUserInfo(userInfoData);
	});
}; // checked!

function printUserInfo(userInfoData) {
	let userName = userInfoData.name;
	let userEmail = userInfoData.email;
	selectorById("nameChecked").innerHTML = "생각 설계자: " + userName + " 대표"
	selectorById("emailChecked").innerHTML = "(" + userEmail + ")"
}; // checked!

// *** bpData 오브젝트 관리를 위한 함수 세트
function requestBpData(user) {

	const userRef = db.ref("users").child(user.uid);
	userRef.on("value", (snapshot) => {
		snapshot.forEach(childSnap => {
			let key = childSnap.key;
			let value = childSnap.val();
			if(key == "bigPicture") {
				let bigPictures = value;
				let bpIds = Object.keys(bigPictures);
				bpIds.forEach( bpId => {
					let bigPicture = bigPictures[bpId];
					let bpTitle = bigPicture.bpTitle;
					bpData[bpTitle] = bigPicture;
					bpData[bpTitle]["bpId"] = bpId;
				});
			};
		});

		let bpTitleArray = Object.keys(bpData);

		if (bpTitleArray.length > 0) {
			let defaultCurrentBpData = createCurrentBpData(bpData);
			console.log("defaultCurrentBpData @ end of requestBpData =", defaultCurrentBpData);
			printCurrentBpData(defaultCurrentBpData);
			putSelectbox(bpData, "selectboxBpTitle");
			btnShowHideHandler("readPaper");
		} else {
			printEmptyPaper();
		}; // checked!
	});
}; // checked!

function emptyBpData(bpData) {
	let bpTitleArray = Object.keys(bpData);
	for (let i = 0; i < bpTitleArray.length; i++) {
	delete bpData[bpTitleArray[i]];
	console.log("emptyBpData well done!")
	};
};

function isEmptyBpData(bpData) {
	let bpTitleArray = Object.keys(bpData);
	console.log("bpTitleArray.length = ", bpTitleArray.length);
	if (bpTitleArray.length == 0) {
		return true;
	} else {
		return false;
	};
};

// *** currentBpData 오브젝트 관리를 위한 함수 세트
function resetCurrentBpData() {
	let resetCurrentBpDataResult = createCurrentBpData(bpData);
	printCurrentBpData(resetCurrentBpDataResult);
};

function createCurrentBpData(){
	let currentBpTitle = indexBpTitle(bpData);
	currentBpData = bpData[currentBpTitle];
	return currentBpData;
}; //checked!

function printCurrentBpData(currentBpData) {
	console.log("currentBpData @ printCurrentBpData = ", currentBpData);
	selectorById("dateChecked").innerHTML = currentBpData.editedDate.slice(0, 10);
	selectorById("bpTitle").innerHTML = currentBpData.bpTitle;
	selectorById("direction").innerHTML = currentBpData.direction;
	selectorById("naviArea").innerHTML = currentBpData.naviArea;
	selectorById("naviB").innerHTML = currentBpData.naviB;
	selectorById("naviA").innerHTML = currentBpData.naviA;
	selectorById("actionPlan").innerHTML = currentBpData.actionPlan;
}; // checked!

// *** indexing BpTitle 관리를 위한 함수 세트
function indexBpTitle(bpData) {

	let selectboxBpTitleValue = selectorById("selectboxBpTitle").value;

	if (selectboxBpTitleValue == "클릭하여 선택") {
		// by reloaded or gotoMainBp_btn(=reloaded)
		let currentBpTitle = findMainBpTitle(bpData);
		return currentBpTitle;
	} else {
		// by selectbox
		let currentBpTitle = selectorById("selectboxBpTitle").value;
		return currentBpTitle;
	};

	// [질문] eventlistener로 할 수 있는 방법은 없을까?
	// let selectboxBpTitle = selectorById("selectboxBpTitle");
	// let isSelectedResult = selectboxBpTitle.addEventListener("change", isSelected);

	// function isSelected() {
	// 	console.log("isSelected() checked!");
	// 	return "selected";
	// };

	// console.log("isSelectedResult = ", isSelectedResult);

	// if (isSelectedResult == "selected") {
	// 	// by selectbox
	// 	let currentBpTitle = selectorById("selectboxBpTitle").value;
	// 	return currentBpTitle;
	// } else {
	// 	// by reloaded or gotoMainBp_btn(=reloaded)
	// 	let currentBpTitle = findMainBpTitle(bpData);
	// 	return currentBpTitle;
	// };

}; // checked!

function getSameBpTitle(newBpTitle) {
	let bpTitleArray = Object.keys(bpData);
	let filterSamebpTitleArray = (query) => {
		return bpTitleArray.find(newBpTitle => query == newBpTitle);
	};
	let samebpTitleArray = filterSamebpTitleArray(newBpTitle);
	return samebpTitleArray;
}; // checked!

// *** selectBox 관리를 위한 함수 세트

function putSelectbox(bpData, selectboxId) {

	let bpTitleArray = Object.keys(bpData);
	let selectbox = selectorById(selectboxId);
	// selectbox 초기화하기
	for (let i = selectbox.options.length - 1; i >= 0; i--) {
		selectbox.remove(i + 1);
	};
	// <option> 만들어서, bpTitleArray 넣기
	for (let i = 0; i < bpTitleArray.length; i++) {
		let option = document.createElement("OPTION");
		let txt = document.createTextNode(bpTitleArray[i]);
		option.appendChild(txt);
		option.setAttribute("value", bpTitleArray[i]);
		selectbox.insertBefore(option, selectbox.lastChild);
	};
	// selected 넣기
	printCurrentBpTitleOnSelectbox(bpData);
}; // checked!

function printCurrentBpTitleOnSelectbox(bpData) {

	let bpTitleArray = Object.keys(bpData);
	let currentBpTitle = currentBpData.bpTitle;

	if (currentBpData != null) {
		for (let i = 1; i < bpTitleArray.length + 1; i++) {
			if(bpTitleArray.length == 0){
				selectorById("selectboxBpTitle").options[0].setAttribute("selected", true);
			} else {
				let optionList = selectorById("selectboxBpTitle").options[i].value;
				if (optionList == currentBpTitle) {
					selectorById("selectboxBpTitle").options[i].setAttribute("selected", true);
				};
			};
		};
	};
}; // checked!

function getBpTitleFromSelectboxBpTitle() {
	let selectedBpTitleValue = selectorById("selectboxBpTitle").value;
	if (selectedBpTitleValue == "클릭하여 선택") {
		let bpTitleArray = Object.keys(bpData);
		selectedBpTitleValue = bpTitleArray[0];
	};
	console.log("getBpTitleFromSelectboxBpTitle well done!");
	return selectedBpTitleValue;
}; // checked!

function openCurrentBpDataBySelectboxBpTitle() {
	resetCurrentBpData();
	printCurrentBpTitleOnSelectbox(bpData);
}; // checked!

// *** mainBpData 관리를 위한 함수 세트

function findMainBpTitle(bpData) {
	let bpTitleArray = Object.keys(bpData);
	for (let i = 0; i < bpTitleArray.length; i++) {
		let mainBpValue = bpData[bpTitleArray[i]].isMainBp;
		if (mainBpValue == "main") {
			let mainBpTitle = bpData[bpTitleArray[i]].bpTitle;
			return mainBpTitle;
		} else {
			setMainBp();
		};
	};
}; // checked!

function setMainBp() {
	
	let updatedBpData = {};

	updatedBpData["isMainBp"] = "main";

	db.ref("users")
		.child(userInfoData.uid)
		.child("bigPicture")
		.child(currentBpData.bpId)
		.update(updatedBpData, (e) => {
		console.log("update completed = ", e);
		});

	unsetMainBp();

	let bpTitleArray = Object.keys(bpData);
	if(bpTitleArray.length > 1){
		alert("메인 페이퍼로 설정이 완료되었습니다.");
	};

	btnShowHideHandler("readPaper");
	location.reload();

}; //checked!

function unsetMainBp() {

	let updatedBpData = {};
	
	updatedBpData["isMainBp"] = "";

	let bpTitleArray = Object.keys(bpData);
	for (let i = 0; i < bpTitleArray.length; i++) {
		let bpIds = bpData[bpTitleArray[i]].bpId;

		if (bpIds != currentBpData.bpId) {
			db.ref("users")
				.child(userInfoData.uid)
				.child("bigPicture")
				.child(bpIds)
				.update(updatedBpData, (e) => {
				console.log("update completed = ", e);
				});
		};
	};
}; // checked!

// *** CRUD 관리를 위한 함수 세트

function printEmptyPaper() {
	selectorById("dateChecked").innerHTML = timeStamp().slice(0, 10);
	selectorById("bpTitle").value = "";
	selectorById("direction").value = "";
	selectorById("naviArea").value = "";
	selectorById("naviB").value = "";
	selectorById("naviA").value = "";
	selectorById("actionPlan").value = "";
	selectorById("guideMessage").innerHTML = "'파란색으로 쓰여진 곳의 네모칸에 내용을 작성해보세요~!'"
	btnShowHideHandler("createFirstPaper");
}; // checked!

function openNewPaper() {
	printEmptyPaper();
	btnShowHideHandler("openNewPaper");
}; // checked!

function saveNewPaper() {

	let newBpData = {};

	newBpData["editedDate"] = timeStamp();
	newBpData["createdDate"] = timeStamp();
	newBpData["direction"] = selectorById("direction").value.trim();
	newBpData["naviArea"] = selectorById("naviArea").value.trim();
	newBpData["naviB"] = selectorById("naviB").value.trim();
	newBpData["naviA"] = selectorById("naviA").value.trim();
	newBpData["actionPlan"] = selectorById("actionPlan").value.trim();

	let newBpTitle = selectorById("bpTitle").value.trim();
	let sameBpTitle = getSameBpTitle(newBpTitle);

	if (newBpTitle != "") {
		if (sameBpTitle == undefined) {
			newBpData["bpTitle"] = newBpTitle;

			let bpTitleArray = Object.keys(bpData);

			// 첫 bpData인 경우, 메인페이지로 셋팅되게하기
			if (bpTitleArray.length == 0){
				newBpData["isMainBp"] = "main";
			} else {
				newBpData["isMainBp"] = "";
			};

			db.ref("users")
				.child(userInfoData.uid)
				.child("bigPicture")
				.push(newBpData);

			const currentUser = firebase.auth().currentUser;
			requestBpData(currentUser);
			highLightBorder("bpTitle", "rgb(200, 200, 200)");
			alert("저장되었습니다.");
			if (bpTitleArray.length == 1){
				location.reload();
			};
		} else {
			highLightBorder("bpTitle", "red");
			alert("중복된 페이퍼 제목이 있습니다. 페이퍼 제목을 수정해주시기 바랍니다.");
		};
	} else {
		highLightBorder("bpTitle", "red");
		alert("페이퍼 제목이 비어있습니다. 페이퍼 제목을 입력해주시기 바랍니다.");
	};
};

function openEditPaper() {

	btnShowHideHandler("editPaper");

};

function cancelEditPaper() {
	createCurrentBpData(bpData);
	highLightBorder("bpTitle", "rgb(200, 200, 200)");
	btnShowHideHandler("readPaper");
};

function saveEditedPaper() {

	let updatedBpData = {};

	updatedBpData["editedDate"] = timeStamp();
	updatedBpData["bpTitle"] = selectorById("bpTitle").value.trim();
	updatedBpData["direction"] = selectorById("direction").value.trim();
	updatedBpData["naviArea"] = selectorById("naviArea").value.trim();
	updatedBpData["naviB"] = selectorById("naviB").value.trim();
	updatedBpData["naviA"] = selectorById("naviA").value.trim();
	updatedBpData["actionPlan"] = selectorById("actionPlan").value.trim();

	let updatedBpTitle = selectorById("bpTitle").value.trim();
	let sameBpTitle = getSameBpTitle(updatedBpTitle);

	if (updatedBpTitle != "") {
		if (sameBpTitle == undefined) {
			updatedBpData["bpTitle"] = updatedBpTitle;
			console.log("updatedBpData @ saveEditedPaper = ", updatedBpData);

			db.ref("users")
				.child(userInfoData.uid)
				.child("bigPicture")
				.child(currentBpData.bpId)
				.update(updatedBpData, (e) => {
				console.log("update completed = ", e);
				});

			//여기부터 수정: currentBpTitle을 얻어오는 것부터 다시 고민해봐야겠다.
			//꼭 서버로부터 request를 안해도 되지 않을까?
			emptyBpData(bpData);
			console.log("bpData @ saveEditedPaper =", bpData);

			const currentUser = firebase.auth().currentUser;
			requestBpData(currentUser);
			highLightBorder("bpTitle", "rgb(200, 200, 200)");
			alert("저장되었습니다.");
		
			} else {
			highLightBorder("bpTitle", "red");
			alert("중복된 페이퍼 제목이 있습니다. 페이퍼 제목을 수정해주시기 바랍니다.");
		};
	} else {
		highLightBorder("bpTitle", "red");
		alert("페이퍼 제목이 비어있습니다. 페이퍼 제목을 입력해주시기 바랍니다.");
	};
};

function removePaper() {

	if (confirm("정말 삭제하시겠습니까?")) {
		db.ref("users")
			.child(userInfoData.uid)
			.child("bigPicture")
			.child(currentBpData.bpId)
			.remove();
		alert("삭제되었습니다.");
		location.reload();
	};

	btnShowHideHandler("readPaper");

};

// *** UI 관리를 위한 함수 세트

function btnShowHideHandler(state) {

	function hide(id) {
		selectorById(id).style.display = "none";
	};
	
	function show(id) {
		selectorById(id).style.display = "initial";
	};
	
	hide("openEditPaper_btn");
	hide("cancelEditPaper_btn");
	hide("saveEditedPaper_btn");
	hide("saveNewPaper_btn");
	hide("removePaper_btn");
	hide("openNewPaper_btn");

	switch(state){
		case "createFirstPaper" :
			show("saveNewPaper_btn");
			hide("setMainBp_btn");
			editModeHandler("editing");
			break;
		case "openNewPaper" :
			show("saveNewPaper_btn");
			show("cancelEditPaper_btn")
			editModeHandler("editing");
			break;
		case "readPaper" :
			show("openEditPaper_btn");
			show("openNewPaper_btn");
			show("removePaper_btn");
			editModeHandler("reading");
			break;
		case "editPaper" :
			show("saveEditedPaper_btn");
			show("cancelEditPaper_btn");
			show("saveNewPaper_btn");
			show("removePaper_btn");
			editModeHandler("editing");
			break;
		default:
			let state = null;
	}
	resizeTextarea();
};

function setMainBpHandler() {

	console.log("currentBpData.isMainBp = ", currentBpData.isMainBp);
	// console.log(currentBpData.isMainBp);
	// if (currentBpData.isMainBp == "main") {
	// 	hide("setMainBp_btn");
	// 	show("setMainBp_txt");
	// } else {
	// 	if(state != "createFirstPaper") {
	// 		show("setMainBp_btn");
	// 	};
	// 	hide("setMainBp_txt");

	// 	let bpTitleArray = Object.keys(bpData);
	// 	if(bpTitleArray.length == 1){
	// 		setMainBp();
	// 		location.reload();
	// 	};

	// };

};

function highLightBorder(id, color) {
	return selectorById(id).style.borderColor = color;
};

function resizeTextarea() {
	// 참고: https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
	const tx = document.getElementsByTagName("textarea");
	for (let i = 0; i < tx.length; i++) {
		//console.log("tx[i].scrollHeight = ", tx[i].scrollHeight);
		tx[i].setAttribute("style", "height:" + (tx[i].scrollHeight) + "px;overflow-y:hidden;");
		tx[i].addEventListener("input", OnInput, false);
	};
	
	function OnInput() {
		this.style.height = "auto";
		this.style.height = (this.scrollHeight) + "px";
	};
}; // check!

function darkmode() {
	let selectorBody = document.querySelector("body")
	let selectorDarkMode = selectorById("darkMode")
	let selectorGridIndex = selectorById("gridIndex")
	let selectordivContentsControl = selectorById("divContentsControl")
	if (selectorDarkMode.value === "다크모드 켜기") {
		selectorBody.style.backgroundColor = "#1E1E1E";
		selectorBody.style.color = "white";
		selectorDarkMode.value = "다크모드 끄기";

		let alist = document.querySelectorAll("a");
		let i = 0;
		while (i < alist.length) {
			alist[i].style.color = "powderblue";
			i = i + 1;
		}

		selectorGridIndex.style.backgroundColor = "#333333";
		selectordivContentsControl.style.backgroundColor = "#333333";

	} else {
		selectorBody.style.backgroundColor = "white";
		selectorBody.style.color = "black";
		selectorDarkMode.value = "다크모드 켜기";

		let alist = document.querySelectorAll("a");
		let i = 0;
		while (i < alist.length) {
			alist[i].style.color = "blue";
			i = i + 1;
		}

		selectorGridIndex.style.backgroundColor = "rgb(240, 240, 240)";
		selectordivContentsControl.style.backgroundColor = "rgb(240, 240, 240)";

	}
}; // 향후 적용하기

// *** 기타 함수 세트
function selectorById(id) {
	return document.getElementById(id);
}; // check!

function timeStamp() {
	let now = new Date();
	let nowString = now.toISOString();
	return nowString;
}; // check!







