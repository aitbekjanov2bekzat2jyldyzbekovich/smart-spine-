import { BleClient } from "@capacitor-community/bluetooth-le";

export async function connectESP32(onData) {
  let buffer = "";
  const decoder = new TextDecoder();

  function processChunk(value) {
    const chunk = decoder.decode(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      { stream: true },
    );

    buffer += chunk;

    // Разделяем только завершённые сообщения
    const messages = buffer.split("\n");

    // Сохраняем незавершённый JSON
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const json = message.trim();

      if (!json) continue;

      try {
        const data = JSON.parse(json);

        if (data.mpu && data.lsm) {
          onData(data);
        }
      } catch (error) {
        console.error("Ошибка JSON:", error);
        console.log("Получено:", json);
      }
    }
  }
  try {
    await BleClient.initialize();

    const device = await BleClient.requestDevice({
      namePrefix: "SmartSpine",
      optionalServices: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
    });

    await BleClient.connect(device.deviceId);

    console.log("ESP32 подключён:", device.name);

    const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    const DATA_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

    let buffer = "";

    await BleClient.startNotifications(
      device.deviceId,
      SERVICE_UUID,
      DATA_UUID,
      (value) => {
        processChunk(value);
      },
    );

    return device;
  } catch (error) {
    console.error("Ошибка Bluetooth:", error);
    throw error;
  }
}
