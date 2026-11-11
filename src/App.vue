<script setup>
import { connectESP32 } from "./services/bluetooth";
import { computed, ref } from "vue";

const mpu = ref(null);

const baseline = ref(null);

function calibratePosture() {
  if (!mpu.value?.mpu?.ok || !mpu.value?.lsm?.ok) {
    alert("Сначала подключите ESP32 и дождитесь данных");
    return;
  }

  baseline.value = {
    mpu: { ...mpu.value.mpu },
    lsm: { ...mpu.value.lsm },
  };
}

function calculateDeviation(sensor, reference) {
  if (!sensor?.ok || !reference) return null;

  // Учитываем переход угла через -180° / +180°
  const angleDiff = (a, b) => ((a - b + 540) % 360) - 180;

  const pitch = angleDiff(sensor.pitch, reference.pitch);
  const roll = angleDiff(sensor.roll, reference.roll);

  return Math.sqrt(pitch ** 2 + roll ** 2);
}

const upperAngle = computed(() =>
  calculateDeviation(mpu.value?.mpu, baseline.value?.mpu),
);

const lowerAngle = computed(() =>
  calculateDeviation(mpu.value?.lsm, baseline.value?.lsm),
);

// Наклон верхней части SVG-человека
const svgUpperAngle = computed(() => {
  if (upperAngle.value === null) return 0;

  return Math.max(-30, Math.min(30, upperAngle.value));
});

// Наклон поясницы SVG-человека
const svgLowerAngle = computed(() => {
  if (lowerAngle.value === null) return 0;

  return Math.max(-25, Math.min(25, lowerAngle.value));
});

const backAngle = computed(() => {
  if (upperAngle.value === null || lowerAngle.value === null) {
    return null;
  }

  return Math.max(upperAngle.value, lowerAngle.value);
});

const activeTab = ref("overview");
const isMonitoring = ref(true);
const showDetails = ref(false);

const readings = ref({
  backAngle: 8,
  leftFoot: 54,
  rightFoot: 46,
  alerts: 3,
  lastUpdated: "Только что",
});

const postureStatus = computed(() => {
  const angle = backAngle.value;

  if (angle === null) {
    return {
      label: "Ожидание калибровки",
      tone: "warn",
      message: "Подключите ESP32 и откалибруйте положение спины.",
    };
  }

  if (angle <= 5) {
    return {
      label: "Хорошая осанка",
      tone: "good",
      message: "Положение спины близко к исходному.",
    };
  }

  if (angle <= 10) {
    return {
      label: "Обратите внимание",
      tone: "warn",
      message: "Обнаружено отклонение от исходной позы.",
    };
  }

  return {
    label: "Нужна коррекция",
    tone: "bad",
    message: "Значительное отклонение. Проверьте положение спины.",
  };
});

const footDifference = computed(() =>
  Math.abs(readings.value.leftFoot - readings.value.rightFoot),
);

function simulateReading() {
  readings.value = {
    backAngle: Math.floor(4 + Math.random() * 25),
    leftFoot: Math.floor(42 + Math.random() * 17),
    rightFoot: 0,
    alerts: readings.value.alerts + (Math.random() > 0.55 ? 1 : 0),
    lastUpdated: new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  readings.value.rightFoot = 100 - readings.value.leftFoot;
}

function resetDemo() {
  readings.value = {
    backAngle: 8,
    leftFoot: 54,
    rightFoot: 46,
    alerts: 3,
    lastUpdated: "Только что",
  };
  isMonitoring.value = true;
}

const bluetoothStatus = ref("Не подключено");

async function handleConnect() {
  try {
    bluetoothStatus.value = "Подключение...";

    await connectESP32((data) => {
      mpu.value = data;
      console.log("MPU:", mpu.value);
    });

    bluetoothStatus.value = "ESP32 подключён";
  } catch (error) {
    bluetoothStatus.value = "Не удалось подключиться";
    console.error(error);
  }
}

const history = [
  { time: "09:00", angle: 12, balance: 50 },
  { time: "10:00", angle: 8, balance: 54 },
  { time: "11:00", angle: 16, balance: 48 },
  { time: "12:00", angle: 7, balance: 52 },
  { time: "13:00", angle: 8, balance: 54 },
];
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" @click.prevent="activeTab = 'overview'">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span>Smart<span class="brand-accent">Spine</span></span>
      </a>
    </header>

    <main class="content">
      <section class="welcome">
        <div>
          <p class="eyebrow">ПОНЕДЕЛЬНИК · ПАНЕЛЬ МОНИТОРИНГА</p>
          <h1>Следите за <span>движением.</span></h1>
          <p class="subtitle">
            Демонстрация осанки и распределения нагрузки на стопы.
          </p>
        </div>

        <div class="device-controls">
          <div class="device-status">
            <span class="connection-dot"></span>
            <span>{{ bluetoothStatus }}</span>
          </div>

          <div class="device-buttons">
            <button
              class="secondary-button"
              @click="handleConnect"
              :disabled="bluetoothStatus === 'Подключение...'"
            >
              🔗 Подключить
            </button>

            <button
              class="primary-button"
              @click="calibratePosture"
              :disabled="!mpu?.mpu?.ok || !mpu?.lsm?.ok"
            >
              ◎ Калибровать
            </button>
          </div>
        </div>
      </section>

      <nav class="tabs" aria-label="Разделы приложения">
        <button
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          Обзор
        </button>
        <button
          :class="{ active: activeTab === 'feet' }"
          @click="activeTab = 'feet'"
        >
          Нагрузка на стопы
        </button>
        <button
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          История
        </button>
      </nav>

      <template v-if="activeTab === 'overview'">
        <section class="status-card" :class="postureStatus.tone">
          <div class="status-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3a2.4 2.4 0 1 0 0 4.8A2.4 2.4 0 0 0 12 3ZM9.5 9.2 7.8 13l2.4 1.6-.8 5.4h2l1-4.2 1.5 4.2h2l-2-6.8 1.4-2.3 1.4 2.5 1.7-.9-2.2-4a1.8 1.8 0 0 0-2.2-.7l-2.2.9-1.3.5Z"
              />
            </svg>
          </div>
          <div class="status-copy">
            <span class="status-kicker">ТЕКУЩИЙ СТАТУС</span>
            <h2>{{ postureStatus.label }}</h2>
            <p>{{ postureStatus.message }}</p>
          </div>
          <div class="angle">
            <strong>
              {{ backAngle === null ? "0°" : Math.round(backAngle) + "°" }}
            </strong>
            <span>Отклонение от калибровки</span>
          </div>
        </section>

        <section class="metric-grid">
          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon cyan">↕</span
              ><span class="metric-label">ОСАНКА</span>
            </div>
            <div class="metric-value">
              <div>
                Верх: {{ upperAngle === null ? 0 : Math.round(upperAngle) }} °
              </div>
              <div>
                Поясница:
                {{ lowerAngle === null ? 0 : Math.round(lowerAngle) }} °
              </div>
            </div>

            <div class="metric-foot">
              <span class="mini-bar">
                <i
                  :style="{
                    width: Math.min((backAngle ?? 0) * 3, 100) + '%',
                    background:
                      backAngle === null
                        ? '#64748b'
                        : backAngle <= 5
                          ? '#22c55e'
                          : backAngle <= 10
                            ? '#f59e0b'
                            : '#ef4444',
                  }"
                ></i>
              </span>
              <span>Наклон спины</span>
            </div>
          </article>
          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon violet">◒</span
              ><span class="metric-label">БАЛАНС СТОП</span>
            </div>
            <div class="metric-value">{{ footDifference }}<small>%</small></div>
            <div class="metric-foot">
              <span class="trend-good">●</span><span>Разница нагрузки</span>
            </div>
          </article>
          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon orange">!</span
              ><span class="metric-label">ПРЕДУПРЕЖДЕНИЯ</span>
            </div>
            <div class="metric-value">{{ readings.alerts }}<small></small></div>
            <div class="metric-foot">
              <span class="trend-neutral">За сегодня</span>
            </div>
          </article>
        </section>

        <section class="panel-grid">
          <article class="panel body-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">БИОМЕХАНИКА</p>
                <h3>Положение тела</h3>
              </div>
              <span class="live-tag"
                ><span class="pulse-dot"></span>
                {{ isMonitoring ? "Мониторинг" : "Пауза" }}</span
              >
            </div>

            <div class="body-visual">
              <div class="orbit orbit-one"></div>
              <div class="orbit orbit-two"></div>

              <svg
                class="human"
                viewBox="0 0 180 260"
                role="img"
                aria-label="Анимированная модель положения тела"
              >
                <defs>
                  <linearGradient id="bodyGrad" x1="0" x2="1">
                    <stop offset="0" stop-color="#28d7d0" />
                    <stop offset="1" stop-color="#6875ff" />
                  </linearGradient>
                </defs>

                <!-- Ноги и таз остаются неподвижными -->
                <g>
                  <path
                    d="M71 157 L109 157 L110 173 L124 235
           L105 235 L88 175 L77 235 L58 235 L71 173 Z"
                    fill="url(#bodyGrad)"
                    opacity=".9"
                  />

                  <path
                    d="M57 239 L42 242 M123 239 L139 242"
                    stroke="#28d7d0"
                    stroke-width="8"
                    stroke-linecap="round"
                  />
                </g>

                <!-- Поясница: LSM -->
                <g
                  :style="{
                    transform: `rotate(${svgLowerAngle}deg)`,
                    transformOrigin: '90px 160px',
                    transition: 'transform 0.25s ease-out',
                  }"
                >
                  <!-- Поясничный отдел -->
                  <path
                    d="M72 110 L108 110 L109 160
           Q90 174 71 160 Z"
                    fill="url(#bodyGrad)"
                    opacity=".9"
                  />

                  <path
                    d="M90 115 Q84 132 90 155"
                    fill="none"
                    stroke="#d4fff8"
                    stroke-width="3.5"
                    stroke-linecap="round"
                  />

                  <circle cx="90" cy="137" r="5" fill="#d4fff8" />

                  <!-- Верхний отдел: MPU -->
                  <g
                    :style="{
                      transform: `rotate(${svgUpperAngle}deg)`,
                      transformOrigin: '90px 112px',
                      transition: 'transform 0.25s ease-out',
                    }"
                  >
                    <!-- Грудная клетка -->
                    <path
                      d="M75 55 Q90 48 105 55
             L119 113 L108 124
             L72 124 L58 113 Z"
                      fill="url(#bodyGrad)"
                      opacity=".9"
                    />

                    <!-- Внутренняя часть -->
                    <path
                      d="M77 61 Q90 76 103 61
             L100 112 Q90 122 80 112 Z"
                      fill="#132b43"
                      opacity=".75"
                    />

                    <!-- Позвоночник -->
                    <path
                      d="M90 62 C83 84 97 91 90 112"
                      fill="none"
                      stroke="#d4fff8"
                      stroke-width="3.5"
                      stroke-linecap="round"
                    />

                    <circle cx="90" cy="83" r="5" fill="#d4fff8" />
                    <circle cx="90" cy="110" r="5" fill="#d4fff8" />

                    <!-- Голова -->
                    <circle
                      cx="90"
                      cy="32"
                      r="17"
                      fill="#d6e5f5"
                      opacity=".9"
                    />

                    <!-- Руки -->
                    <path
                      d="M60 69 L42 120 L30 151
             M116 69 L137 118 L148 148"
                      stroke="#8a9ffb"
                      stroke-width="13"
                      stroke-linecap="round"
                      fill="none"
                    />
                  </g>
                </g>
              </svg>

              <!-- Верхний датчик -->
              <div class="callout callout-top">
                <span></span>
                <div>
                  <b>
                    {{
                      upperAngle === null ? "—" : Math.round(upperAngle) + "°"
                    }}
                  </b>
                  <small>Верхняя часть </small>
                </div>
              </div>

              <!-- Нижний датчик -->
              <div class="callout callout-bottom">
                <span></span>
                <div>
                  <b>
                    {{
                      lowerAngle === null ? "—" : Math.round(lowerAngle) + "°"
                    }}
                  </b>
                  <small>Поясница </small>
                </div>
              </div>
            </div>
          </article>

          <article class="panel balance-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">РАСПРЕДЕЛЕНИЕ ВЕСА</p>
                <h3>Баланс нагрузки</h3>
              </div>
              <span class="tiny-info">i</span>
            </div>
            <div class="balance-summary">
              <div>
                <span class="balance-number">{{ readings.leftFoot }}%</span
                ><span class="balance-caption">Левая нога</span>
              </div>
              <div class="balance-divider"></div>
              <div>
                <span class="balance-number">{{ readings.rightFoot }}%</span
                ><span class="balance-caption">Правая нога</span>
              </div>
            </div>
            <div class="balance-bar">
              <span :style="{ width: readings.leftFoot + '%' }"></span><i></i>
            </div>
            <div class="feet-visual">
              <div class="foot-wrap">
                <div class="foot-shape left-foot">
                  <span class="heat heat-a"></span
                  ><span class="heat heat-b"></span
                  ><span class="heat heat-c"></span>
                </div>
                <span>Левая</span>
              </div>
              <div class="foot-wrap">
                <div class="foot-shape right-foot">
                  <span class="heat heat-a"></span
                  ><span class="heat heat-b"></span
                  ><span class="heat heat-c"></span>
                </div>
                <span>Правая</span>
              </div>
            </div>
            <div class="legend">
              <span><i class="legend-dot low"></i>Низкая нагрузка</span
              ><span><i class="legend-dot high"></i>Высокая нагрузка</span>
            </div>
            <button class="text-button" @click="activeTab = 'feet'">
              Подробнее о стопах <span>→</span>
            </button>
          </article>
        </section>
      </template>

      <template v-else-if="activeTab === 'feet'">
        <section class="page-intro">
          <p class="eyebrow">АНАЛИЗ СТОП</p>
          <h2>Распределение нагрузки</h2>
          <p>Условные показатели для демонстрации интерфейса.</p>
        </section>
        <section class="metric-grid two">
          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon cyan">L</span
              ><span class="metric-label">ЛЕВАЯ НОГА</span>
            </div>
            <div class="metric-value">
              {{ readings.leftFoot }}<small>%</small>
            </div>
            <div class="mini-bar wide">
              <i :style="{ width: readings.leftFoot + '%' }"></i>
            </div>
          </article>
          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon violet">R</span
              ><span class="metric-label">ПРАВАЯ НОГА</span>
            </div>
            <div class="metric-value">
              {{ readings.rightFoot }}<small>%</small>
            </div>
            <div class="mini-bar wide">
              <i :style="{ width: readings.rightFoot + '%' }"></i>
            </div>
          </article>
        </section>
        <article class="panel foot-detail">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">СРАВНЕНИЕ</p>
              <h3>Баланс между ногами</h3>
            </div>
            <span class="balance-badge">{{ footDifference }}% разница</span>
          </div>
          <div class="compare-row">
            <span>Левая нога</span>
            <div class="compare-track">
              <i :style="{ width: readings.leftFoot + '%' }"></i>
            </div>
            <b>{{ readings.leftFoot }}%</b>
          </div>
          <div class="compare-row">
            <span>Правая нога</span>
            <div class="compare-track purple">
              <i :style="{ width: readings.rightFoot + '%' }"></i>
            </div>
            <b>{{ readings.rightFoot }}%</b>
          </div>
          <p class="disclaimer">
            В реальном устройстве точность зависит от калибровки датчиков и
            конструкции стельки.
          </p>
        </article>
      </template>

      <template v-else>
        <section class="page-intro">
          <p class="eyebrow">ИСТОРИЯ ИЗМЕРЕНИЙ</p>
          <h2>Активность за сегодня</h2>
          <p>Пример демонстрационных измерений.</p>
        </section>
        <article class="panel history-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">НАКЛОН СПИНЫ</p>
              <h3>Угол по времени</h3>
            </div>
            <span class="unit-tag">градусы</span>
          </div>
          <div class="chart">
            <div class="chart-guides">
              <span>25°</span><span>20°</span><span>15°</span><span>10°</span
              ><span>5°</span>
            </div>
            <svg
              viewBox="0 0 500 210"
              preserveAspectRatio="none"
              role="img"
              aria-label="График демонстрационных значений угла наклона"
            >
              <path
                d="M20 175 L135 190 L250 145 L365 195 L480 190"
                fill="none"
                stroke="#3bd5ce"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M20 175 L135 190 L250 145 L365 195 L480 190 L480 205 L20 205Z"
                fill="#3bd5ce"
                opacity=".1"
              />
              <g fill="#0d1525" stroke="#3bd5ce" stroke-width="3">
                <circle cx="20" cy="175" r="5" />
                <circle cx="135" cy="190" r="5" />
                <circle cx="250" cy="145" r="5" />
                <circle cx="365" cy="195" r="5" />
                <circle cx="480" cy="190" r="5" />
              </g>
            </svg>
            <div class="chart-times">
              <span v-for="item in history" :key="item.time">{{
                item.time
              }}</span>
            </div>
          </div>
          <div class="history-list">
            <div v-for="item in history" :key="item.time" class="history-item">
              <span class="history-time">{{ item.time }}</span
              ><span class="history-line"></span
              ><span class="history-reading">{{ item.angle }}°</span
              ><span
                class="history-status"
                :class="item.angle <= 10 ? 'ok' : 'attention'"
                >{{ item.angle <= 10 ? "Норма" : "Внимание" }}</span
              >
            </div>
          </div>
        </article>
      </template>

      <footer>
        <div class="footer-brand">Smart<span>Spine</span></div>
      </footer>
    </main>
  </div>
</template>
<style lang="css" scoped>
.device-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.device-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.device-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-buttons button {
  white-space: nowrap;
  border-radius: 12px;
  padding: 12px 18px;
  cursor: pointer;
  transition: 0.2s;
}

.device-buttons button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.device-buttons button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .device-controls {
    width: 100%;
    align-items: flex-start;
  }

  .device-buttons {
    width: 100%;
    flex-wrap: wrap;
  }

  .device-buttons button {
    flex: 1;
  }
}
</style>
