(() => {
	if (window.hasRun) {
		return;
	}
	window.hasRun = true;

	const getStreamsForTab = (tabId) => browser.storage.local.get(tabId);

	// These aren't atomic, but whatever

	const addStream = async (tabId, stream) => {
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
		streams = streams[tabId] || [];
		streams = streams.filter(stream => stream.id !== streamId);
		console.log({ tabId: streams });
		browser.storage.local.set({ tabId: streamId });
	};

	const deleteAll = (tabId) => {
		console.log('deleting all', tabId);
		browser.storage.local.remove(tabId);
	};

	const messageHandler = (message) => {
		console.log(message);
		if (message.command === 'chooser-start') {
			myId = message.id;
			addStream(myId, {
				id: someIndex
			});
			someIndex += 1;
		} else if (message.command === 'stop-all') {
			deleteAll(myId);
		}
	};

	let myId = null;
	let someIndex = 0;

	browser.runtime.onMessage.addListener(messageHandler);

	window.onbeforeunload = () => {
		browser.runtime.onMessage.removeListener(messageHandler);
		deleteAll(myId);
	};
})();