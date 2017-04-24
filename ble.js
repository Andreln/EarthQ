
const FREQ_Service_UUID         = '49f89999-edd1-4c81-8702-585449ba92a8';
const FREQ_Char_UUID            = '49f88888-edd1-4c81-8702-585449ba92a8';

const MPU_Service_UUID          = '00000004-1212-efde-1523-785fef13d123';
const MPU_Char_UUID             = '00000005-1212-efde-1523-785fef13d123';

const MPU_Control_Service_UUID  = '11115555-1212-efde-1523-785fef13d123';
const MPU_Control_Char_UUID     = '11116666-1212-efde-1523-785fef13d123';

var bleDeviceFreqControl;
var bleServerFreqControl;

var bleDeviceAccelerometer;
var bleServerAccelerometer;

var MPU_Service;
var MPU_Characteristic;
var MPU_Control_Service;
var MPU_Control_Characteristic;

var accValueZ;
var timeY;

var FREQ_Service;
var FREQ_Characteristic;

window.onload = function(){
  document.querySelector('#connectToAccBtn').addEventListener('click', connectAccelerometer);
  document.querySelector('#connectToFreqBtn').addEventListener('click', connectFrequencyControl);
  document.querySelector('#disconnectBtn').addEventListener('click', disconnect);
  document.querySelector('#refresh').addEventListener('click', disconnect);
  document.querySelector('#frequencyInput').addEventListener("change", sendFrequency);

  document.getElementById("MPU_Service_UUID").textContent=MPU_Service_UUID;
  document.getElementById("MPU_Char_UUID").textContent=MPU_Char_UUID;

  document.getElementById("FREQ_Service_UUID").textContent=FREQ_Service_UUID;
  document.getElementById("FREQ_Char_UUID").textContent=FREQ_Char_UUID;

  document.querySelector('#turnAccOn').addEventListener('click', MPU_Control_ON);
  document.querySelector('#turnAccOff').addEventListener('click', MPU_Control_OFF);
  document.querySelector('#toggleModeToRealTime').addEventListener('click', MPU_Control_MODE1);
  document.querySelector('#toggleModeToTakeMeasurement').addEventListener('click', MPU_Control_MODE2);
}

// BLE-Connection
function connectFrequencyControl() {
  'use strict'

	if (!navigator.bluetooth) {
    log('Web Bluetooth API is not available.\n' +
        'Please make sure the Web Bluetooth flag is enabled.');
	  return;
	}

	let deviceUUIDS = { filters:[{ services: [FREQ_Service_UUID]}]};

	log('Requesting Bluetooth Device...');
	navigator.bluetooth.requestDevice(deviceUUIDS)
	.then(device => {
		bleDeviceFreqControl = device;
		bleDeviceFreqControl.addEventListener('gattserverdisconnected', disconnectedFromPeripheral);
		log('Found ' + bleDeviceFreqControl.name + '...');
		log('Connecting to GATT-server...');
		connectLoaderToggle('connectingToFreqDiv','connectBtnToFreqDiv');
		return bleDeviceFreqControl.gatt.connect();
	})

	.then(gattServer => {
		bleServerFreqControl = gattServer;
		log('Connected to Frequency Control...');
		return bleServerFreqControl.getPrimaryService(FREQ_Service_UUID);
	})

	.then(service => {
	  FREQ_Service = service;
	  log('Freq Service Retrieved...');
	  return Promise.all([
		  FREQ_Service.getCharacteristic(FREQ_Char_UUID)
		  .then(characteristic => {
				FREQ_Characteristic = characteristic;
				log('Freq characteristic retrieved...');
				connectLoaderToggle('connectToAccelerometerDiv','connectToFreqDiv');
				connectLoaderToggle('connectBtnToFreqDiv','connectingToFreqDiv');
		  }),
	  ])
	})

	.catch(error => {
		log('> connect ' + error);
	});


}

function connectAccelerometer() {
  'use strict'

	if (!navigator.bluetooth) {
	log('Web Bluetooth API is not available.\n' +
		'Please make sure the Web Bluetooth flag is enabled.');
	  return;
	}

	let deviceUUIDS = { filters:[{ services: [MPU_Service_UUID]}],
                                optionalServices: [MPU_Control_Service_UUID, MPU_Control_Char_UUID]};

	log('Requesting Bluetooth Device...');
	navigator.bluetooth.requestDevice(deviceUUIDS)
	.then(device => {
		bleDeviceAccelerometer = device;
		bleDeviceAccelerometer.addEventListener('gattserverdisconnected', disconnectedFromPeripheral);
		log('Found ' + bleDeviceAccelerometer.name + '...');
		log('Connecting to GATT-server...');
		connectLoaderToggle('connectingToAccelerometerDiv','connectBtnToAccelerometerDiv');
		return bleDeviceAccelerometer.gatt.connect();
	})

	.then(gattServer => {
		bleServerAccelerometer = gattServer;
		log('Bluetooth Device Connected...');
		return bleServerAccelerometer.getPrimaryService(MPU_Service_UUID);
	})

	.then(service => {
		MPU_Service = service;
		log('MPU Service Retrieved...');
		return Promise.all([
			MPU_Service.getCharacteristic(MPU_Char_UUID)
			.then(characteristic => {
				MPU_Characteristic = characteristic;
				log('MPU characteristic retrieved...');
				// MPU_Characteristic.addEventListener('characteristicvaluechanged', MPU_Data_Received);
				// MPU_Characteristic.startNotifications();
		  }),
	  ])
	})

  .then(() => {
		log('Getting MPU Control Service...');
		return bleServerAccelerometer.getPrimaryService(MPU_Control_Service_UUID);
	})

  .then(service => {
    MPU_Control_Service = service;
    log('MPU Control Service Retrieved...');
    return Promise.all([
      MPU_Control_Service.getCharacteristic(MPU_Control_Char_UUID)
      .then(characteristic => {
        MPU_Control_Characteristic = characteristic;
        log('MPU Control characteristic retrieved...');

        View('ControlView');
        connectLoaderToggle('connectBtnToAccelerometerDiv','connectingToAccelerometerDiv');
        statusBar('connected');
      }),
    ])
  })

	.catch(error => {
		log('> connect ' + error);
	});


}
// BLE-Connection End


function log(text) {
    console.log(text);
    document.querySelector('#log').textContent += text + '\n';
}

function disconnect() {
    if (!bleDevice) {
       log('No Bluetooth Device connected...');
        return;
    }

    log('Disconnecting from Bluetooth Device...');
    if (bleDevice.gatt.connected) {
       bleDevice.gatt.disconnect();
        log('> Bluetooth Device connected: ' + bleDevice.gatt.connected);
    }
    else {
       log('> Bluetooth Device is already disconnected');
    }
    isConnected = false;
}

function connectedToPeripheral(){
	View('ControlView');
  statusBar('connected');
  buttonToggle('disconnectDiv', 'connectDiv');
}

function disconnectedFromPeripheral () {
    log('Something went wrong. You are now disconnected from the device');
    View('ConnectionView');
    statusBar('notConnected');
    buttonToggle('connectDiv', 'disconnectDiv');
}


function MPU_Data_Received(){
    let value = event.target.value;
    value = value.buffer ? value: new DataView(value);

    accValueZ = value.getUint8(0) | ((value.getUint8(1) << 8)&0xff00);

    accValueZ = (accValueZ / 16384) - 1;
    accValueZ = accValueZ.toFixed(2);

    document.getElementById('accelerometerValue').value = accValueZ;
    // document.getElementById('timeGet').value = timeY;

    updateGraph(accValueZ);
}



function MPU_Control_ON(){
  setModeMPU(1,0);
}

function MPU_Control_OFF(){
  setModeMPU(0,0);
}

function MPU_Control_MODE1(){
  setModeMPU(1,1);
}

function MPU_Control_MODE2(){
  setModeMPU(1,2);
}


// Starts and changes modes on frequency measurment
function setModeMPU(onOff, Mode){

  onOff = parseInt(onOff);
  Mode = parseInt(Mode);

  if(onOff==1 || onOff==0){
    let data = new Uint8Array(1);
    data[0] = onOff;
    data[1] = Mode;

    try {
      MPU_Control_Characteristic.writeValue(data);
    } catch (error) {
      log(error);
    }

    }
    else{
        // Nothing
    }
}


function changeFreqValue(value){
	let freqValue = document.getElementById("frequencyInput").value;
	freqValue = Number(freqValue);
	value = Number(value);
	let newValue = freqValue + value;
	document.getElementById("frequencyInput").value = newValue;
	sendFrequency();
}

function changeVolumeValue(value){
	let volumeValue = document.getElementById("amplitudeInput").value;
	volumeValue = Number(volumeValue);
	value = Number(value);
	let newValue = volumeValue + value;
	document.getElementById("amplitudeInput").value = newValue;
	sendFrequency();
}


// Sends frequency value and volumevalue
function sendFrequency(){
  let freqValue = document.getElementById("frequencyInput").value;
  let data = new Uint8Array(4);
  freqValue = parseInt(freqValue);

  let volumeValue = document.getElementById("amplitudeInput").value;
  volumValue = parseInt(volumeValue);

  data[0] = 1;
  data[1] = (freqValue >> 8) & 0xff;
  data[2] = (freqValue & 0xff);
  data[3] = volumValue;

 //  log(data);
  try {
    FREQ_Characteristic.writeValue(data);
  } catch (error) {
    log(error);
  }
}
