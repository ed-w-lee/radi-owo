import { createRoom, deleteRoom, getMyRooms } from '../net';
import { CLEAN_STATE, SetStateFn, State } from '../state';
import { bgPingPong, hideAllExcept } from './util';

export const renderRoomsList = async (state: State, setState: SetStateFn) => {
  if (!state.authToken || !state.allRooms) {
    console.error('RenderRoomsList FAILED DUE TO AUTHTOKEN OR ALLROOMS');
    return;
  }

  hideAllExcept('room-selection');

  const contents = document.getElementById('room-selection-contents')!;
  contents.textContent = '';

  state.allRooms.forEach((info) => {
    const row = document.createElement('tr');

    const nameEntry = document.createElement('td');
    nameEntry.textContent = info.name;

    const actionEntry = document.createElement('td');
    const useEntryButton = document.createElement('button');
    useEntryButton.textContent = 'Host';
    useEntryButton.onclick = () => {
      console.log('[popup] clicked to use room:', info.id);
      if (state.authToken) {
        bgPingPong({
          command: 'start-room',
          roomId: info.id,
          authToken: state.authToken,
        }, (msg) => {
          if (msg.description === 'action-response') {
            if (msg.success) {
              setState({ currentRoom: info.id });
              return;
            }
          }
          console.error('[popup] unexpected response from background');
        });
      }
    };
    actionEntry.appendChild(useEntryButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = async () => {
      console.log('[popup] clicked to delete room:', info.id);
      if (state.authToken) {
        const roomsRes = await deleteRoom(state.authToken, info.id);
        if (roomsRes === 'AuthError') {
          setState(CLEAN_STATE);
          return;
        } if (typeof (roomsRes) === 'string') {
          console.error('[popup] delete room error');
          setState(CLEAN_STATE);
          return;
        }
        const allRooms = state.allRooms?.filter((room) => room.id !== info.id);
        setState({ allRooms });
      }
    };
    actionEntry.append(deleteButton);

    row.appendChild(nameEntry);
    row.appendChild(actionEntry);

    contents.appendChild(row);
  });

  const createRow = document.createElement('tr');

  const inputEntry = document.createElement('td');
  const nameInput = document.createElement('input');
  nameInput.setAttribute('type', 'text');
  nameInput.setAttribute('placeholder', 'room name');
  inputEntry.appendChild(nameInput);

  const actionEntry = document.createElement('td');
  const createButton = document.createElement('button');
  createButton.textContent = 'Create';
  createButton.onclick = async () => {
    console.log('[popup] clicked to create room:', nameInput.value);
    if (state.authToken) {
      const roomsRes = await createRoom(state.authToken, nameInput.value);
      if (roomsRes === 'AuthError') {
        setState(CLEAN_STATE);
        return;
      } if (typeof (roomsRes) === 'string') {
        console.error('[popup] create room error:', roomsRes);
        setState(CLEAN_STATE);
        return;
      }
      setState({ allRooms: state.allRooms ? [...state.allRooms, roomsRes] : [roomsRes] });
    }
  };
  actionEntry.appendChild(createButton);
  createRow.append(inputEntry, actionEntry);
  contents.appendChild(createRow);
};

export const attemptGetRooms = async (state: State, setState: SetStateFn) => {
  if (!state.user || !state.authToken) {
    console.error('ATTEMPTED TO GET ROOMS WITHOUT USER OR TOKEN');
    return;
  }

  const roomsRes = await getMyRooms(state.authToken);
  if (roomsRes === 'AuthError') {
    setState(CLEAN_STATE);
    console.error('[popup] get rooms auth error');
    return;
  } if (typeof (roomsRes) === 'string') {
    console.error('[popup] get rooms error:', roomsRes);
    setState(CLEAN_STATE);
    return;
  }

  console.log('[popup] gotten rooms:', roomsRes);

  bgPingPong({
    command: 'query-room',
  }, (msg) => {
    if (msg.description === 'room-info') {
      setState({ allRooms: roomsRes, currentRoom: msg.roomId || undefined });
      return;
    }
    console.error('[popup] unexpected response from background');
  });
};
