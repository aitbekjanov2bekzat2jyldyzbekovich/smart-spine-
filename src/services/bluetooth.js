import { BleClient } from '@capacitor-community/bluetooth-le'

export async function connectESP32() {
  try {
    await BleClient.initialize()

    const device = await BleClient.requestDevice({
      namePrefix: 'SmartSpine'
    })

    await BleClient.connect(device.deviceId)

    console.log('ESP32 подключён:', device.name)

    return device
  } catch (error) {
    console.error('Ошибка Bluetooth:', error)
    throw error
  }
}