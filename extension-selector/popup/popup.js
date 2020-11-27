const getStreams = async () => await browser.storage.local.get();

const renderStreamList = (streams) => {
	const container = document.getElementById('elements-list-container');
	container.innerHTML = ''; // clear children of the list

	tabIds = Object.keys(streams);
	console.log(tabIds);
	if (tabIds.length > 0) {
		const elementsList = document.createElement('ul');
		tabIds.forEach(tabId => {
			streams[tabId].forEach(stream => {
				const entry = document.createElement('li');
				entry.innerText = `tab: ${tabId} stream: ${stream.id}`;

				const deleteButton = document.createElement('button');
				deleteButton.innerText = "delete";
				deleteButton.addEventListener('click', () => {
					browser.tabs.sendMessage(parseInt(tabId), {
						command: 'stop-id',
						id: tabId,
						streamId: stream.id,
					}).catch(e =>
						console.log('failed to stop: ', tabId, stream.id, e)
					);
				});
				entry.appendChild(deleteButton);
				elementsList.appendChild(entry);
			});
		});
		container.appendChild(elementsList);
	} else {
		container.innerText = 'No streams exist at this time.';
	}
};

const storageChangeHandler = (changes, areaName) => {
	if (areaName === 'local') {
		// re-render list of things
		getStreams().then(renderStreamList);
	}
};

const clickHandler = (e) => {
	const onClickAction = () => {
		console.log('clicked action');
		if (e.target.classList.contains('action-chooser')) {
			// we want to start the element chooser process in the current tab
			browser.tabs.query({ active: true, currentWindow: true })
				.then(myTab => {
					browser.tabs.sendMessage(myTab[0].id, {
						command: 'chooser-start',
						id: myTab[0].id.toString(),
					})
						.catch(e => console.log('failed to send to:', myTab[0].id, e))
				});
		}
		else if (e.target.classList.contains('action-clear')) {
			// clear all tracked streams
			browser.tabs.query({}).then(allTabs => {
				allTabs.forEach(tab => {
					browser.tabs.sendMessage(tab.id, {
						command: 'stop-all',
						id: tab.id.toString(),
					}).catch(e => console.log('failed to send to:', tab.id, e));
				});
			});
		}
	}

	if (e.target.classList.contains('action')) {
		// get all tabs in case we need to clear our listening to a certain tab
		onClickAction();
	}
};

let isListening = false;
const addListeners = () => {
	if (isListening) {
		return;
	}
	isListening = true;

	document.addEventListener('click', clickHandler);
	browser.storage.onChanged.addListener(storageChangeHandler);
	window.onblur = () => {
		browser.storage.onChanged.removeListener(storageChangeHandler);
	}
}

const startup = () => {
	getStreams().then(renderStreamList);
	addListeners();
};

let executed = false;
(() => {
	if (executed) return;
	executed = true;

	console.log('executing script');

	browser.tabs.executeScript({ file: '/content_scripts/stream_manager.js' })
		.then(startup)
		.catch(e => console.log('there was some error in executing', e));
})();