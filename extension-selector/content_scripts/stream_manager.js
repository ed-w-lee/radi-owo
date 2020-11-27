(() => {
	if (window.hasRun) {
		return;
	}
	window.hasRun = true;

	let myId = null;
	let someIndex = 0;

	const getStreamsForTab = (tabId) => browser.storage.local.get(tabId);

	const findMediaElement = (el, parentDepth = 2) => {
		for (i = 0; i < parentDepth; i++) {
			el = el.parentNode;
		}
		return el.querySelector('audio') || el.querySelector('video');
	};

	// These aren't atomic, but whatever
	const mediaElementCSS = `
		video {
			border: 5px solid red;
		}
		audio {
			border: 5px solid red;
		}
	`;
	const chooseStream = (index) => {
		console.log('choosing stream');
		const styleElement = document.createElement('style');
		styleElement.innerHTML = mediaElementCSS;

		document.head.appendChild(styleElement);
		console.log("injected CSS");

		return new Promise((resolve, reject) => {
			const listener = (e) => {
				e.preventDefault();
				e.stopPropagation();
				teardown();
				mediaElement = findMediaElement(e.target);
				if (mediaElement) {
					resolve({
						id: index,
						element: mediaElement.outerHTML,
					});
				} else {
					reject();
				}
			}

			const teardown = () => {
				console.log('teardown');
				window.removeEventListener('blur', teardown);
				window.removeEventListener('click', listener, { capture: true });
				document.head.removeChild(styleElement);
			}
			window.addEventListener('click', listener, { capture: true });
			window.addEventListener('blur', teardown);
		});
	};

	const addStream = async (tabId, index) => {
		console.log("adding stream");
		stream = await chooseStream(index);

		console.log('adding to stream', tabId, stream);
		getStreamsForTab(tabId)
			.then(streams => {
				updated = streams[tabId] || [];
				updated.push(stream);
				streams[tabId] = updated;
				browser.storage.local.set(streams);
			})
			.catch(e => console.log('failed adding to stream', e));
		console.log('test');
	};

	const deleteStream = async (tabId, streamId) => {
		console.log('deleting stream', tabId, streamId);
		streams = await getStreamsForTab(tabId);
		updated = streams[tabId] || [];
		console.log(updated);
		updated = updated.filter(stream => stream.id !== streamId);
		console.log(updated);
		if (updated.length === 0) {
			browser.storage.local.remove(tabId);
		} else {
			streams[tabId] = updated;
			browser.storage.local.set(streams);
		}
	};

	const deleteAll = (tabId) => {
		console.log('deleting all', tabId);
		browser.storage.local.remove(tabId);
	};

	const messageHandler = (message) => {
		console.log(message);
		if (message.command === 'chooser-start') {
			myId = message.id;
			someIndex += 1;
			addStream(myId, someIndex);
		} else if (message.command === 'stop-all') {
			deleteAll(myId || message.id);
		} else if (message.command === 'stop-id') {
			deleteStream(myId || message.id, message.streamId);
		}
	};

	browser.runtime.onMessage.addListener(messageHandler);

	window.onbeforeunload = () => {
		browser.runtime.onMessage.removeListener(messageHandler);
		deleteAll(myId);
	};
})();