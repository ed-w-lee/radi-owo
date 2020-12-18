import { createRoom, getMyRooms, GetRoomsResponse } from "../net";
import { CLEAN_STATE, SetStateFn, State } from "../state";
import { hideAllExcept } from "./util";

export const renderRoomsList = async (state: State, setState: SetStateFn) => {
  if (!state.allRooms) {
    console.error("RenderRoomsList FAILED DUE TO ALLROOMS");
    return;
  }

  hideAllExcept('room-selection');

  const contents = document.getElementById('room-selection-contents')!;
  contents.innerHTML = '';

  state.allRooms.forEach((info) => {
    const row = document.createElement('tr');

    const nameEntry = document.createElement('td');
    nameEntry.innerHTML = info.name;

    const actionEntry = document.createElement('td');
    const useEntryButton = document.createElement('button');
    useEntryButton.innerHTML = 'Host';
    useEntryButton.onclick = () => {
      console.log('clicked to use room:', info.id);
    }
    actionEntry.appendChild(useEntryButton);

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
  createButton.innerHTML = 'Create';
  createButton.onclick = async () => {
    console.log('clicked to create room:', nameInput.value);
    if (state.authToken) {
      const roomsRes = await createRoom(state.authToken, nameInput.value);
      if (roomsRes === 'AuthError') {
        setState(CLEAN_STATE);
        return;
      } else if (typeof (roomsRes) === 'string') {
        console.error('create room error:', roomsRes);
        setState(CLEAN_STATE);
        return;
      }
      setState({ allRooms: state.allRooms ? [...state.allRooms, roomsRes] : [roomsRes] });
    }
  }
  actionEntry.appendChild(createButton);
  createRow.append(inputEntry, actionEntry);
  contents.appendChild(createRow);
};

export const attemptGetRooms = async (state: State, setState: SetStateFn) => {
  if (!state.user || !state.authToken) {
    console.error("ATTEMPTED TO GET ROOMS WITHOUT USER OR TOKEN");
    return;
  }

  const roomsRes = await getMyRooms(state.authToken);
  if (roomsRes === 'AuthError') {
    setState(CLEAN_STATE);
    console.error('get rooms auth error');
    return;
  } else if (typeof (roomsRes) === 'string') {
    console.error('get rooms error:', roomsRes);
    setState(CLEAN_STATE);
    return;
  }

  console.log('gotten rooms:', roomsRes);
  // TODO - we'll need to handle getting current room or something
  setState({ allRooms: roomsRes });
}
