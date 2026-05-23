/**
 * Soil Sensor Mock API Service
 * Simulates a direct HTTP / API integration from an IoT soil moisture sensor.
 */

interface SensorResponse {
  success: boolean;
  moisture: number;
  sensorId: string;
  batteryLevel: number;
  lastUpdated: string;
  status: 'optimal' | 'dry' | 'wet';
}

/**
 * Simulates a fetch call to a mock IoT soil sensor API.
 * Uses realistic crop/location parameters if provided to determine realistic moisture levels.
 */
export const fetchMockSensorData = async (
  cropType?: string,
  location?: string
): Promise<SensorResponse> => {
  // Simulate network latency (between 800ms and 1500ms)
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

  let baseMoisture = 40; // Default moderate moisture

  // Context-aware logic based on crop type
  if (cropType) {
    const crop = cropType.toLowerCase().trim();
    if (crop.includes('lettuce') || crop.includes('cabbage') || crop.includes('spinach') || crop.includes('mint')) {
      // Leafy greens prefer rich, wet soils
      baseMoisture = 68;
    } else if (crop.includes('cactus') || crop.includes('succulent') || crop.includes('lavender') || crop.includes('rosemary') || crop.includes('sage')) {
      // Drought-tolerant plants prefer dry soils
      baseMoisture = 22;
    } else if (crop.includes('tomato') || crop.includes('pepper') || crop.includes('eggplant') || crop.includes('cucumber')) {
      // Nightshades prefer consistent moderate moisture
      baseMoisture = 42;
    } else if (crop.includes('corn') || crop.includes('wheat') || crop.includes('sunflower')) {
      baseMoisture = 35;
    }
  }

  // Location-based adjustment (hot/desert vs rainy/humid)
  if (location) {
    const loc = location.toLowerCase().trim();
    if (loc.includes('phoenix') || loc.includes('desert') || loc.includes('las vegas') || loc.includes('sahara') || loc.includes('arizona')) {
      baseMoisture = Math.max(12, baseMoisture - 15);
    } else if (loc.includes('seattle') || loc.includes('portland') || loc.includes('rain') || loc.includes('london') || loc.includes('bogota')) {
      baseMoisture = Math.min(88, baseMoisture + 18);
    }
  }

  // Add random variance of +/- 6% to mimic real fluctuated readings
  const variance = Math.floor(Math.random() * 13) - 6;
  const finalMoisture = Math.min(100, Math.max(0, baseMoisture + variance));

  // Determine soil state
  let status: 'optimal' | 'dry' | 'wet' = 'optimal';
  if (finalMoisture < 30) {
    status = 'dry';
  } else if (finalMoisture > 70) {
    status = 'wet';
  }

  // Generate a random but consistent-looking IoT sensor device identifier
  const sensorNodes = ['IoT-SOIL-NODE-042', 'IoT-SOIL-NODE-109', 'IoT-SOIL-NODE-511', 'IoT-SOIL-NODE-893'];
  const sensorId = sensorNodes[Math.floor(Math.random() * sensorNodes.length)];
  const batteryLevel = Math.floor(82 + Math.random() * 17); // 82% to 99%

  return {
    success: true,
    moisture: finalMoisture,
    sensorId,
    batteryLevel,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status,
  };
};
