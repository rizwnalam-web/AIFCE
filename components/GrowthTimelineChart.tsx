import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getWeatherForecast } from '../services/geminiService';

export interface GrowthTimelineChartProps {
  cropName: string;
  location?: string;
}

export interface WeatherHighlight {
  weekStart: number;
  weekEnd: number;
  type: 'temp_cold' | 'temp_hot' | 'storm_rain' | 'high_wind';
  title: string;
  color: string;
  description: string;
  vulnerabilityMsg: string;
  forecastSource: string;
}

const parseTemp = (tStr: string): number | null => {
  if (!tStr) return null;
  const num = parseFloat(tStr.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
};

const getFallbackForecast = (location: string): any => {
  const normLoc = location.trim().toLowerCase();
  if (normLoc.includes('phoenix') || normLoc.includes('arizona') || normLoc.includes('desert') || normLoc.includes('tx') || normLoc.includes('texas')) {
    return {
      location: location,
      forecast: [
        { day: "Monday", high: "98°F", low: "76°F", precipitation: "0%", wind: "8 mph", description: "Scorching Sunny" },
        { day: "Tuesday", high: "101°F", low: "78°F", precipitation: "0%", wind: "10 mph", description: "Extreme Heat" },
        { day: "Wednesday", high: "99°F", low: "75°F", precipitation: "0%", wind: "12 mph", description: "Sunny" },
        { day: "Thursday", high: "102°F", low: "79°F", precipitation: "0%", wind: "9 mph", description: "Extreme Heat" },
        { day: "Friday", high: "100°F", low: "77°F", precipitation: "5%", wind: "15 mph", description: "Sunny" },
        { day: "Saturday", high: "97°F", low: "74°F", precipitation: "0%", wind: "11 mph", description: "Sunny" },
        { day: "Sunday", high: "99°F", low: "76°F", precipitation: "0%", wind: "8 mph", description: "Sunny" }
      ]
    };
  } else if (normLoc.includes('miami') || normLoc.includes('florida') || normLoc.includes('coast') || normLoc.includes('tropical') || normLoc.includes('hi') || normLoc.includes('hawaii')) {
    return {
      location: location,
      forecast: [
        { day: "Monday", high: "84°F", low: "74°F", precipitation: "85%", wind: "28 mph", description: "Tropical Thunderstorms" },
        { day: "Tuesday", high: "83°F", low: "73°F", precipitation: "90%", wind: "32 mph", description: "Heavy Flooding Rain & Squalls" },
        { day: "Wednesday", high: "85°F", low: "75°F", precipitation: "70%", wind: "22 mph", description: "Heavy Showers" },
        { day: "Thursday", high: "86°F", low: "76°F", precipitation: "45%", wind: "18 mph", description: "Scattered Rain" },
        { day: "Friday", high: "87°F", low: "76°F", precipitation: "30%", wind: "12 mph", description: "Partly Cloudy" },
        { day: "Saturday", high: "86°F", low: "75°F", precipitation: "80%", wind: "25 mph", description: "Thunderstorms" },
        { day: "Sunday", high: "85°F", low: "74°F", precipitation: "60%", wind: "19 mph", description: "Rain Showers" }
      ]
    };
  } else if (normLoc.includes('napa') || normLoc.includes('california') || normLoc.includes('ca') || normLoc.includes('valley') || normLoc.includes('oregon') || normLoc.includes('or') || normLoc.includes('portland') || normLoc.includes('seattle') || normLoc.includes('wash') || normLoc.includes('wa')) {
    return {
      location: location,
      forecast: [
        { day: "Monday", high: "55°F", low: "33°F", precipitation: "20%", wind: "6 mph", description: "Frosty Morning / Clear" },
        { day: "Tuesday", high: "52°F", low: "31°F", precipitation: "10%", wind: "7 mph", description: "Severe Freezing Frost" },
        { day: "Wednesday", high: "58°F", low: "35°F", precipitation: "5%", wind: "5 mph", description: "Cold / Sunny" },
        { day: "Thursday", high: "62°F", low: "39°F", precipitation: "15%", wind: "8 mph", description: "Partly Cloudy" },
        { day: "Friday", high: "65°F", low: "42°F", precipitation: "40%", wind: "11 mph", description: "Light Rain" },
        { day: "Saturday", high: "58°F", low: "34°F", precipitation: "10%", wind: "9 mph", description: "Frost Risk Night" },
        { day: "Sunday", high: "60°F", low: "36°F", precipitation: "5%", wind: "5 mph", description: "Sunny / Cold" }
      ]
    };
  } else {
    return {
      location: location,
      forecast: [
        { day: "Monday", high: "72°F", low: "52°F", precipitation: "20%", wind: "12 mph", description: "Mild & Sunny" },
        { day: "Tuesday", high: "75°F", low: "55°F", precipitation: "65%", wind: "30 mph", description: "Strong Winds & Storms" },
        { day: "Wednesday", high: "68°F", low: "48°F", precipitation: "15%", wind: "14 mph", description: "Clearing Cold Front" },
        { day: "Thursday", high: "74°F", low: "53°F", precipitation: "5%", wind: "8 mph", description: "Sunny" },
        { day: "Friday", high: "78°F", low: "56°F", precipitation: "10%", wind: "10 mph", description: "Warm & Clear" },
        { day: "Saturday", high: "83°F", low: "59°F", precipitation: "30%", wind: "15 mph", description: "Increasing Humidity" },
        { day: "Sunday", high: "80°F", low: "57°F", precipitation: "50%", wind: "22 mph", description: "Scattered Rain" }
      ]
    };
  }
};

export const getForecastImpactHighlights = (crop: string, location: string, forecast: any): WeatherHighlight[] => {
  const normCrop = crop.trim().toLowerCase();
  const highlights: WeatherHighlight[] = [];

  if (!forecast || !forecast.forecast) return [];

  let severeFrostDetected = false;
  let coldStuntingDetected = false;
  let heatwaveDetected = false;
  let severeStormsDetected = false;
  let strongWindsDetected = false;

  let firstFrostDay = "";
  let firstHeatDay = "";
  let firstStormDay = "";
  let firstWindDay = "";

  forecast.forecast.forEach((day: any) => {
    const desc = (day.description || "").toLowerCase();
    const highVal = parseTemp(day.high) ?? 70;
    const lowVal = parseTemp(day.low) ?? 50;
    const precipVal = parseFloat((day.precipitation || "0").replace(/[^0-9.-]/g, '')) || 0;
    const windVal = parseFloat((day.wind || "0").replace(/[^0-9.-]/g, '')) || 0;

    if (lowVal <= 32 || desc.includes('frost') || desc.includes('freeze') || desc.includes('freezing') || desc.includes('snow')) {
      if (!severeFrostDetected) {
        severeFrostDetected = true;
        firstFrostDay = `${day.day} (${lowVal}°F / ${day.description})`;
      }
    } else if (lowVal < 45 || desc.includes('cold')) {
      if (!coldStuntingDetected) {
        coldStuntingDetected = true;
        firstFrostDay = `${day.day} (${lowVal}°F / ${day.description})`;
      }
    }

    if (highVal >= 90 || desc.includes('heatwave') || desc.includes('scorching') || desc.includes('extreme heat')) {
      if (!heatwaveDetected) {
        heatwaveDetected = true;
        firstHeatDay = `${day.day} (${highVal}°F / ${day.description})`;
      }
    }

    if (precipVal >= 75 || desc.includes('flood') || desc.includes('thunderstorm') || desc.includes('deluge') || desc.includes('downpour') || desc.includes('torrential')) {
      if (!severeStormsDetected) {
        severeStormsDetected = true;
        firstStormDay = `${day.day} (${precipVal}% precip / ${day.description})`;
      }
    }

    if (windVal >= 25 || desc.includes('gale') || desc.includes('strong wind') || desc.includes('high wind')) {
      if (!strongWindsDetected) {
        strongWindsDetected = true;
        firstWindDay = `${day.day} (${day.wind})`;
      }
    }
  });

  if (severeFrostDetected || coldStuntingDetected) {
    const isSevere = severeFrostDetected;
    if (normCrop.includes('tomato') || normCrop.includes('pepper') || normCrop.includes('eggplant')) {
      highlights.push({
        weekStart: 0,
        weekEnd: 4,
        type: 'temp_cold',
        title: isSevere ? '🚨 Frost Damage Risk' : '⚠️ Cold Stunting Risk',
        color: '#3b82f6',
        description: `Predicted cold snaps (${firstFrostDay}) are hazardous. Warm-season nightshades shut down root activity below 55°F and freeze to death under 32°F.`,
        vulnerabilityMsg: 'Protective structures like row tunnels are highly critical at Weeks 0-4 to guard young crops.',
        forecastSource: firstFrostDay
      });
    } else if (normCrop.includes('strawberry') || normCrop.includes('berry')) {
      highlights.push({
        weekStart: 5,
        weekEnd: 8,
        type: 'temp_cold',
        title: '🚨 Blossom Frost Threat',
        color: '#60a5fa',
        description: `Cold temps (${firstFrostDay}) can injure strawberry blossoms, resulting in black-centered aborted berries.`,
        vulnerabilityMsg: 'Weeks 5-8 blooms must be covered overnight if sub-freezing snaps are expected.',
        forecastSource: firstFrostDay
      });
    } else {
      highlights.push({
        weekStart: 0,
        weekEnd: 3,
        type: 'temp_cold',
        title: '⚠️ Early Seedling Frost Risk',
        color: '#60a5fa',
        description: `Unseasonal chill (${firstFrostDay}) slows molecular processes and delays initial root development for new seedlings.`,
        vulnerabilityMsg: 'Weeks 0-3 seedlings should be sheltered or kept under heavy mulching.',
        forecastSource: firstFrostDay
      });
    }
  }

  if (heatwaveDetected) {
    if (normCrop.includes('lettuce') || normCrop.includes('spinach') || normCrop.includes('salad') || normCrop.includes('basil')) {
      highlights.push({
        weekStart: 4,
        weekEnd: 7,
        type: 'temp_hot',
        title: '🔥 Live Heat Bolting Alert',
        color: '#ef4444',
        description: `Forecasted heat (${firstHeatDay}) forces quick seed-stalk growth (bolting) in leafy greens, immediately ruining leaf flavor.`,
        vulnerabilityMsg: 'At Weeks 4-7, utilize shade cloth and overhead misting to lower the canopy micro-climate.',
        forecastSource: firstHeatDay
      });
    } else if (normCrop.includes('tomato')) {
      highlights.push({
        weekStart: 6,
        weekEnd: 9,
        type: 'temp_hot',
        title: '🔥 Blossom Drop Danger',
        color: '#f43f5e',
        description: `Temperatures above 90°F (${firstHeatDay}) during tomatoes' flowering window cause flower stem abscission (blossom drop).`,
        vulnerabilityMsg: 'At Weeks 6-9, apply premium root mulches and deep morning hydration to keep the root mass cool.',
        forecastSource: firstHeatDay
      });
    } else if (normCrop.includes('corn') || normCrop.includes('maize')) {
      highlights.push({
        weekStart: 7,
        weekEnd: 10,
        type: 'temp_hot',
        title: '🔥 Pollination Desiccation Threat',
        color: '#f97316',
        description: `Extreme dry heat (${firstHeatDay}) dries out corn silks within hours, preventing pollen from fertilizing the kernels.`,
        vulnerabilityMsg: 'At Weeks 7-10 (Tasseling/Silking), ensure abundant soil moisture to maintain silk health.',
        forecastSource: firstHeatDay
      });
    } else if (normCrop.includes('potato')) {
      highlights.push({
        weekStart: 8,
        weekEnd: 13,
        type: 'temp_hot',
        title: '🔥 Tuber Bulking Halt Risk',
        color: '#f97316',
        description: `Soil temperatures rising from heatwave (${firstHeatDay}) halt starch conversion in potato tubers. Photosynthesis is spent on respiration.`,
        vulnerabilityMsg: 'At Weeks 8-13, secure a thick straw mulch layer to protect underground bulking zones.',
        forecastSource: firstHeatDay
      });
    } else {
      highlights.push({
        weekStart: 5,
        weekEnd: 9,
        type: 'temp_hot',
        title: '⚠️ Mid-Season Transpirational Stress',
        color: '#f97316',
        description: `Spike in heat (${firstHeatDay}) challenges root water transport capacities, leading to temporary daytime wilting.`,
        vulnerabilityMsg: 'At Weeks 5-9, water very deeply in the early morning to preempt afternoon drying.',
        forecastSource: firstHeatDay
      });
    }
  }

  if (severeStormsDetected) {
    if (normCrop.includes('carrot') || normCrop.includes('potato') || normCrop.includes('root')) {
      highlights.push({
        weekStart: 5,
        weekEnd: 9,
        type: 'storm_rain',
        title: '🌊 Root Rot & Waterlogging Risk',
        color: '#a855f7',
        description: `Saturated soil conditions forecasted (${firstStormDay}) suffocate root zones, inviting fungal root rot.`,
        vulnerabilityMsg: 'At Weeks 5-9 (Root Expansion), optimize row trenches to prevent standing puddle areas.',
        forecastSource: firstStormDay
      });
    } else {
      highlights.push({
        weekStart: 0,
        weekEnd: 3,
        type: 'storm_rain',
        title: '🌊 Torrential Runoff / Washout Alert',
        color: '#a855f7',
        description: `Heavy precipitation bursts (${firstStormDay}) raise severe runoff risks, washing out newly sown seeds or exposing seedling root systems.`,
        vulnerabilityMsg: 'At Weeks 0-3, secure surface covers or straw borders to retard topsoil drift.',
        forecastSource: firstStormDay
      });
    }
  }

  if (strongWindsDetected) {
    if (normCrop.includes('corn') || normCrop.includes('maize') || normCrop.includes('wheat') || normCrop.includes('grain')) {
      highlights.push({
        weekStart: 8,
        weekEnd: 13,
        type: 'high_wind',
        title: '🌬️ Lodging & Stock Damage Risk',
        color: '#06b6d4',
        description: `Predicted high surface winds (${firstWindDay}) can uproot or snap heavy, tall stalks (crop lodging).`,
        vulnerabilityMsg: 'At Weeks 8-13, hilling up soil around corn bases adds mechanical support to fight gales.',
        forecastSource: firstWindDay
      });
    } else if (normCrop.includes('tomato')) {
      highlights.push({
        weekStart: 7,
        weekEnd: 11,
        type: 'high_wind',
        title: '🌬️ Staking Failure & Vine Snapping',
        color: '#06b6d4',
        description: `High forecasted winds (${firstWindDay}) act as severe shear force against top-heavy tomato vines.`,
        vulnerabilityMsg: 'At Weeks 7-11, check stake anchors and secure primary central branches.',
        forecastSource: firstWindDay
      });
    } else {
      highlights.push({
        weekStart: 6,
        weekEnd: 10,
        type: 'high_wind',
        title: '🌬️ Mechanical Foliage Shredding Risk',
        color: '#06b6d4',
        description: `High wind gusts (${firstWindDay}) cause leaf tearing, twig breaking, and premature fruit shedding.`,
        vulnerabilityMsg: 'At Weeks 6-10, verify neighboring windbreak nets and trellis connections.',
        forecastSource: firstWindDay
      });
    }
  }

  return highlights;
};

const generateGrowthData = (crop: string): DataPoint[] => {
  const normCrop = crop.trim().toLowerCase();
  
  // Decide maturity duration in weeks based on crop name
  let weeks = 12;
  let stages = [
    { name: "Sowing", start: 0, end: 1 },
    { name: "Germination", start: 1, end: 3 },
    { name: "Vegetative", start: 3, end: 6 },
    { name: "Flowering", start: 6, end: 9 },
    { name: "Fruiting", start: 9, end: 11 },
    { name: "Harvest", start: 11, end: 12 }
  ];

  if (normCrop.includes('tomato')) {
    weeks = 12;
    stages = [
      { name: "Sowing", start: 0, end: 1.5 },
      { name: "Germination", start: 1.5, end: 3 },
      { name: "Vegetative", start: 3, end: 6 },
      { name: "Flowering", start: 6, end: 8.5 },
      { name: "Fruiting", start: 8.5, end: 11 },
      { name: "Harvest Ready", start: 11, end: 12 }
    ];
  } else if (normCrop.includes('corn') || normCrop.includes('maize')) {
    weeks = 14;
    stages = [
      { name: "Planted", start: 0, end: 1.5 },
      { name: "Emergence", start: 1.5, end: 3 },
      { name: "V-Leafing", start: 3, end: 7 },
      { name: "Tasseling", start: 7, end: 9.5 },
      { name: "Silking / Ear Dev", start: 9.5, end: 12 },
      { name: "Maturity Stage", start: 12, end: 14 }
    ];
  } else if (normCrop.includes('carrot') || normCrop.includes('root')) {
    weeks = 10;
    stages = [
      { name: "Direct Sown", start: 0, end: 1.5 },
      { name: "Cotyledon sprout", start: 1.5, end: 3 },
      { name: "Top Growth", start: 3, end: 5 },
      { name: "Root Expansion", start: 5, end: 7.5 },
      { name: "Maturity phase", start: 7.5, end: 9 },
      { name: "Harvest window", start: 9, end: 10 }
    ];
  } else if (normCrop.includes('lettuce') || normCrop.includes('spinach') || normCrop.includes('salad') || normCrop.includes('basil')) {
    weeks = 8;
    stages = [
      { name: "Sown", start: 0, end: 1 },
      { name: "Emergence", start: 1, end: 2 },
      { name: "Seedling Growth", start: 2, end: 4 },
      { name: "Rapid Leaf Dev", start: 4, end: 6 },
      { name: "Heading / Full canopy", start: 6, end: 7 },
      { name: "Harvest Window", start: 7, end: 8 }
    ];
  } else if (normCrop.includes('potato')) {
    weeks = 16;
    stages = [
      { name: "Seed tuber planted", start: 0, end: 2 },
      { name: "Sprout Dev", start: 2, end: 4.5 },
      { name: "Vine Vegetative", start: 4.5, end: 8 },
      { name: "Tuber Init", start: 8, end: 11 },
      { name: "Tuber Bulking", start: 11, end: 14.5 },
      { name: "Vine Senescence & Harvest", start: 14.5, end: 16 }
    ];
  } else if (normCrop.includes('wheat') || normCrop.includes('barley') || normCrop.includes('grain')) {
    weeks = 15;
    stages = [
      { name: "Sowing", start: 0, end: 1.5 },
      { name: "Tillering", start: 1.5, end: 4 },
      { name: "Stem extension", start: 4, end: 7.5 },
      { name: "Heading / Flowering", start: 7.5, end: 10 },
      { name: "Milky Dough", start: 10, end: 13 },
      { name: "Ripening & Harvest", start: 13, end: 15 }
    ];
  } else if (normCrop.includes('strawberry') || normCrop.includes('berry')) {
    weeks = 12;
    stages = [
      { name: "Establishment", start: 0, end: 2 },
      { name: "Runner/葉 Production", start: 2, end: 5 },
      { name: "Flowering", start: 5, end: 7.5 },
      { name: "Fruit Dev (White berries)", start: 7.5, end: 10 },
      { name: "Full Ripening (Red)", start: 10, end: 11.5 },
      { name: "Harvesting & Renovating", start: 11.5, end: 12 }
    ];
  }

  const dataPoints: DataPoint[] = [];
  
  for (let w = 0; w <= weeks; w++) {
    // Current stage determination
    let currentStage = stages[stages.length - 1].name;
    for (const st of stages) {
      if (w >= st.start && w <= st.end) {
        currentStage = st.name;
        break;
      }
    }

    // Mathematical approximations of biological growthcurves (Sigmoid curves)
    const t = w / weeks;
    
    // Canopy grows as a nice sigmoid curve
    const canopy = Math.round((1 / (1 + Math.exp(-9 * (t - 0.42)))) * 100);
    
    // Root grows slightly faster or shifted earlier to anchor the plant
    const root = Math.round((1 / (1 + Math.exp(-8 * (t - 0.3)))) * 100);
    
    // Yield potential only starts locking in during flowering/fruiting (mid-to-late growth)
    let yieldPotential = 0;
    if (t > 0.4) {
      yieldPotential = Math.round((1 / (1 + Math.exp(-12 * (t - 0.72)))) * 100);
    }

    dataPoints.push({
      week: w,
      canopy: Math.min(100, Math.max(0, canopy)),
      root: Math.min(100, Math.max(0, root)),
      yieldPotential: Math.min(100, Math.max(0, yieldPotential)),
      stage: currentStage
    });
  }

  return dataPoints;
};

export const generatePreviousSeasonData = (crop: string): DataPoint[] => {
  const currentData = generateGrowthData(crop);
  return currentData.map(d => {
    // Sluggish growth due to cooler spring last season (approx 10-15% lower maturation rate)
    const prevCanopy = Math.max(0, Math.min(100, Math.round(d.canopy * 0.85 - (d.week < 5 ? 2 : 0))));
    // Roots searched deeper early, but reached a lower asymptote offset
    const prevRoot = Math.max(0, Math.min(100, Math.round(d.root * 0.90 + (d.week < 4 ? 3 : -1))));
    // Yield was slightly deferred by 1 week
    const prevYield = Math.max(0, Math.min(100, Math.round(d.yieldPotential * 0.82)));
    return {
      week: d.week,
      canopy: prevCanopy,
      root: prevRoot,
      yieldPotential: prevYield,
      stage: d.stage
    };
  });
};

export interface StressPeriod {
  startWeek: number;
  endWeek: number;
  stageName: string;
  stressType: string;
  label: string;
  color: string;
  description: string;
}

export const getCropStressPeriods = (crop: string): StressPeriod[] => {
  const normCrop = crop.trim().toLowerCase();
  
  if (normCrop.includes('tomato')) {
    return [
      {
        startWeek: 1.5,
        endWeek: 3,
        stageName: "Germination",
        stressType: "Frost Risk",
        label: "Cold Sensitivity",
        color: "#3b82f6",
        description: "Tomato seedlings are highly vulnerable to frost. Soil temperatures below 15°C (59°F) stunt initial root elongation."
      },
      {
        startWeek: 6,
        endWeek: 8.5,
        stageName: "Flowering",
        stressType: "Heat stress (Bloom Drop)",
        label: "Blossom Abortion Risk",
        color: "#f43f5e",
        description: "Heat above 30°C (86°F) aborts pollen viability. This halts fertilization, triggering blossom drop and low fruit set."
      }
    ];
  } else if (normCrop.includes('corn') || normCrop.includes('maize')) {
    return [
      {
        startWeek: 7,
        endWeek: 10,
        stageName: "Tasseling / Silking",
        stressType: "Heat & Moisture Drought",
        label: "Pollination Vulnerability",
        color: "#ef4444",
        description: "Extreme heat above 32°C (90°F) desiccates emerging silks and sterilizes pollen, leading to incomplete grain fill on ears."
      }
    ];
  } else if (normCrop.includes('lettuce') || normCrop.includes('spinach') || normCrop.includes('salad') || normCrop.includes('basil')) {
    return [
      {
        startWeek: 4.5,
        endWeek: 7,
        stageName: "Rapid Leaf & Heading",
        stressType: "Heat Bolting Alert",
        label: "Bitter Bolting Window",
        color: "#f59e0b",
        description: "Temperatures above 24°C (75°F) signal the plant to bolt (flower). Leaves turn woody, fibrous, and intensely bitter."
      }
    ];
  } else if (normCrop.includes('carrot') || normCrop.includes('root')) {
    return [
      {
        startWeek: 5,
        endWeek: 8,
        stageName: "Root Expansion",
        stressType: "Soil Temperature Spike",
        label: "Root Distortion Risk",
        color: "#f97316",
        description: "Soil temperatures exceeding 25°C (77°F) retard carotene development. This results in woody, pale, and misshapen taproots."
      }
    ];
  } else if (normCrop.includes('potato')) {
    return [
      {
        startWeek: 8,
        endWeek: 13,
        stageName: "Tuber Growth & Bulking",
        stressType: "Heat Inhibition",
        label: "Bulking Shutdown Threshold",
        color: "#ef4444",
        description: "Starch storage and bulking in potato tubers drops to zero when daytime foliage temperatures remain above 29°C (84°F)."
      }
    ];
  } else if (normCrop.includes('wheat') || normCrop.includes('barley') || normCrop.includes('grain')) {
    return [
      {
        startWeek: 7.5,
        endWeek: 10,
        stageName: "Heading & Flowering",
        stressType: "Late Frost & Heat Risk",
        label: "Anthesis Sterility Window",
        color: "#d946ef",
        description: "Frost below 0°C or thermal heat above 31°C kills delicate spikelets during anthesis, causing empty glumes and loss of yield."
      }
    ];
  } else if (normCrop.includes('strawberry') || normCrop.includes('berry')) {
    return [
      {
        startWeek: 5,
        endWeek: 8.5,
        stageName: "Flowering & Fruit Set",
        stressType: "Blossom Damage & Softening",
        label: "Bud Frost & Heat Softening",
        color: "#f43f5e",
        description: "Blossoms are destroyed by near-freezing snaps (<0°C). Excessive heat (>28°C) leads to premature soft, small, berry formation."
      }
    ];
  } else {
    return [
      {
        startWeek: 5,
        endWeek: 8,
        stageName: "Mid-Season Transition",
        stressType: "Climate Vulnerability",
        label: "Maturation Stress Window",
        color: "#f59e0b",
        description: "Core growth phase. Sharp extreme temperature swings degrade overall photosynthetic efficiency and root health."
      }
    ];
  }
};

export const GrowthTimelineChart: React.FC<GrowthTimelineChartProps> = ({ cropName, location }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [activeHoverData, setActiveHoverData] = useState<DataPoint | null>(null);
  const [showPreviousSeason, setShowPreviousSeason] = useState(false);
  const [weatherForecast, setWeatherForecast] = useState<any | null>(null);
  const [weatherImpactHighlights, setWeatherImpactHighlights] = useState<WeatherHighlight[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(true);

  // User target threshold interactive states
  const [targetThreshold, setTargetThreshold] = useState<number>(65);
  const [thresholdMetric, setThresholdMetric] = useState<'canopy' | 'root' | 'yieldPotential'>('canopy');

  // Load live or fallback weather forecasts and evaluate timeline risk highlights
  useEffect(() => {
    if (!location) {
      setWeatherForecast(null);
      setWeatherImpactHighlights([]);
      return;
    }

    const fetchWeatherAndAnalyze = async () => {
      setLoadingWeather(true);
      try {
        const forecastStr = await getWeatherForecast(location);
        const parsed = JSON.parse(forecastStr);
        if (parsed && !parsed.error && parsed.forecast) {
          setWeatherForecast(parsed);
          const highlights = getForecastImpactHighlights(cropName, location, parsed);
          setWeatherImpactHighlights(highlights);
        } else {
          const fallback = getFallbackForecast(location);
          setWeatherForecast(fallback);
          const highlights = getForecastImpactHighlights(cropName, location, fallback);
          setWeatherImpactHighlights(highlights);
        }
      } catch (err) {
        const fallback = getFallbackForecast(location);
        setWeatherForecast(fallback);
        const highlights = getForecastImpactHighlights(cropName, location, fallback);
        setWeatherImpactHighlights(highlights);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeatherAndAnalyze();
  }, [location, cropName]);

  // Measure container using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const containerWidth = Math.max(280, width);
      setDimensions({
        width: containerWidth,
        height: Math.min(420, Math.max(240, Math.round(containerWidth * 0.45)))
      });
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Drawing D3 Line Chart
  useEffect(() => {
    if (!svgRef.current) return;

    const data = generateGrowthData(cropName);
    
    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Adjust margins for readability on smaller screens
    const isSmall = dimensions.width < 500;
    const margin = { 
      top: 25, 
      right: isSmall ? 25 : 130, 
      bottom: 45, 
      left: isSmall ? 35 : 45 
    };
    
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Append inner canvas group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // X and Y scales
    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.week) || 12])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Create tick lines/grid
    const xGrid = d3.axisBottom(x)
      .ticks(Math.min(10, data.length))
      .tickSize(-height)
      .tickFormat(() => '');

    const yGrid = d3.axisLeft(y)
      .ticks(5)
      .tickSize(-width)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${height})`)
      .call(xGrid)
      .style('stroke', '#374151')
      .style('stroke-opacity', 0.25)
      .style('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .style('stroke', '#374151')
      .style('stroke-opacity', 0.25)
      .style('stroke-dasharray', '2,2');

    // ─── TEMPERATURE VULNERABILITY ALERT RECTS/LABELS ───
    const stressPeriods = getCropStressPeriods(cropName);
    const stressG = g.append('g').attr('class', 'stress-g');
    
    stressPeriods.forEach((sp) => {
      const xStart = x(sp.startWeek);
      const xEnd = x(sp.endWeek);
      const bandWidth = xEnd - xStart;

      if (bandWidth <= 0) return;

      // Draw background stress band
      stressG.append('rect')
        .attr('x', xStart)
        .attr('y', 0)
        .attr('width', bandWidth)
        .attr('height', height)
        .style('fill', sp.color)
        .style('fill-opacity', 0.06)
        .style('stroke', sp.color)
        .style('stroke-opacity', 0.22)
        .style('stroke-dasharray', '3,3')
        .style('stroke-width', 1.2);

      // Warning flag text centered at the top of the band
      const labelY = isSmall ? 10 : 15;
      
      stressG.append('text')
        .attr('x', xStart + bandWidth / 2)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .text(`⚠️ ${sp.label}`)
        .style('fill', sp.color)
        .style('font-size', isSmall ? '8px' : '9px')
        .style('font-weight', '700')
        .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 1px 2px rgba(11, 15, 26, 0.9)');
    });

    // ─── LIVE WEATHER PREDICTION OVERLAYS ───
    if (showWeatherOverlay && weatherImpactHighlights.length > 0) {
      const weatherOverlayG = g.append('g').attr('class', 'weather-overlay-g');
      
      weatherImpactHighlights.forEach((wh, index) => {
        const xStart = x(wh.weekStart);
        const xEnd = x(wh.weekEnd);
        const bandWidth = xEnd - xStart;

        if (bandWidth <= 0) return;

        // Draw overlay vertical belt
        weatherOverlayG.append('rect')
          .attr('x', xStart)
          .attr('y', 0)
          .attr('width', bandWidth)
          .attr('height', height)
          .style('fill', wh.color)
          .style('fill-opacity', 0.1)
          .style('stroke', wh.color)
          .style('stroke-opacity', 0.5)
          .style('stroke-dasharray', '2,2')
          .style('stroke-width', 1.5)
          .attr('rx', 4)
          .attr('ry', 4);

        // Top Flag icon + title (offset alternate flags vertically to prevent collision)
        const offsetMultiplier = index % 2 === 0 ? 1 : 2.5;
        const flagY = isSmall ? (8 * offsetMultiplier) : (16 * offsetMultiplier);
        
        const emoji = wh.type === 'temp_cold' ? '❄️' : (wh.type === 'temp_hot' ? '🔥' : (wh.type === 'storm_rain' ? '⛈️' : '🌬️'));
        
        weatherOverlayG.append('text')
          .attr('x', xStart + bandWidth / 2)
          .attr('y', flagY + 8)
          .attr('text-anchor', 'middle')
          .text(`${emoji} ${wh.title}`)
          .style('fill', wh.color)
          .style('font-size', isSmall ? '7px' : '9px')
          .style('font-weight', '800')
          .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
          .style('pointer-events', 'none')
          .style('filter', 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.95))');
      });
    }

    // Axes
    const xAxis = d3.axisBottom(x)
      .ticks(Math.min(10, data.length))
      .tickFormat(d => `Wk ${d}`);
      
    const yAxis = d3.axisLeft(y)
      .ticks(5)
      .tickFormat(d => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis)
      .style('color', '#9ca3af') // gray-400
      .style('font-size', '10px')
      .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .select('.domain')
      .style('stroke', '#4b5563');

    g.append('g')
      .call(yAxis)
      .style('color', '#9ca3af') // gray-400
      .style('font-size', '10px')
      .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .select('.domain')
      .style('stroke', '#4b5563');

    // Define gradients for areas (to look incredibly clean and high quality)
    const defs = svg.append('defs');

    // Canopy area gradient (faint green glow)
    const canopyGrad = defs.append('linearGradient')
      .attr('id', 'canopy-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    canopyGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.12);
    canopyGrad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0);

    // Area generator for canopy
    const areaGen = d3.area<DataPoint>()
      .x(d => x(d.week))
      .y0(height)
      .y1(d => y(d.canopy))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('class', 'area-canopy')
      .attr('d', areaGen)
      .style('fill', 'url(#canopy-grad)');

    // Line generators
    const canopyLine = d3.line<DataPoint>()
      .x(d => x(d.week))
      .y(d => y(d.canopy))
      .curve(d3.curveMonotoneX);

    const rootLine = d3.line<DataPoint>()
      .x(d => x(d.week))
      .y(d => y(d.root))
      .curve(d3.curveMonotoneX);

    const yieldLine = d3.line<DataPoint>()
      .x(d => x(d.week))
      .y(d => y(d.yieldPotential))
      .curve(d3.curveMonotoneX);

    // Draw the 3 lines with nice curves
    const canopyPath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981') // emerald-500
      .attr('stroke-width', 2.5)
      .attr('d', canopyLine);

    const rootPath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b') // amber-500
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('d', rootLine);

    const yieldPath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6') // blue-500
      .attr('stroke-width', 2)
      .attr('d', yieldLine);

    // Subtle entrance animations
    const animate = (pathSelection: d3.Selection<SVGPathElement, any, null, undefined>) => {
      const node = pathSelection.node();
      if (!node) return;
      const length = node.getTotalLength();
      pathSelection
        .attr('stroke-dasharray', `${length} ${length}`)
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(1000)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    };

    animate(canopyPath);
    animate(rootPath);
    animate(yieldPath);

    // Draw previous season comparison reference lines
    if (showPreviousSeason) {
      const prevData = generatePreviousSeasonData(cropName);

      const prevCanopyLine = d3.line<DataPoint>()
        .x(d => x(d.week))
        .y(d => y(d.canopy))
        .curve(d3.curveMonotoneX);

      const prevRootLine = d3.line<DataPoint>()
        .x(d => x(d.week))
        .y(d => y(d.root))
        .curve(d3.curveMonotoneX);

      const prevYieldLine = d3.line<DataPoint>()
        .x(d => x(d.week))
        .y(d => y(d.yieldPotential))
        .curve(d3.curveMonotoneX);

      const pCanopyPath = g.append('path')
        .datum(prevData)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0.35)
        .attr('d', prevCanopyLine);

      const pRootPath = g.append('path')
        .datum(prevData)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0.35)
        .attr('d', prevRootLine);

      const pYieldPath = g.append('path')
        .datum(prevData)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0.35)
        .attr('d', prevYieldLine);

      animate(pCanopyPath);
      animate(pRootPath);
      animate(pYieldPath);
    }

    // Vertical milestone lines for crop stages change
    const milestones: { week: number; stage: string }[] = [];
    let prevStage = '';
    data.forEach(d => {
      if (d.stage !== prevStage) {
        milestones.push({ week: d.week, stage: d.stage });
        prevStage = d.stage;
      }
    });

    const milestoneG = g.append('g').attr('class', 'milestone-g');
    
    milestones.forEach((m, i) => {
      if (m.week === 0) return; // skip initial
      
      // Draw dotted vertical line
      milestoneG.append('line')
        .attr('x1', x(m.week))
        .attr('y1', 0)
        .attr('x2', x(m.week))
        .attr('y2', height)
        .style('stroke', '#374151')
        .style('stroke-opacity', 0.6)
        .style('stroke-dasharray', '2,4')
        .style('stroke-width', 1);

      // Label milestones
      if (!isSmall) {
        milestoneG.append('text')
          .attr('x', x(m.week) + 4)
          .attr('y', 15 + (i % 3) * 14) // Stagger labels so they don't collision-overlap
          .text(m.stage)
          .style('fill', '#6b7280') // gray-500
          .style('font-size', '9px')
          .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
          .style('font-weight', '500')
          .style('pointer-events', 'none');
      }
    });

    // Custom legend positioning (inline right side on large screens, simplified block elements below chart)
    if (!isSmall) {
      const legendData = [
        { label: 'Canopy Density', color: '#10b981', desc: 'Photosynthetic leaf cover' },
        { label: 'Root Depth', color: '#f59e0b', desc: 'Moisture/nutrient access' },
        { label: 'Yield Potential', color: '#3b82f6', desc: 'Flowering & fruiting logic' }
      ];

      const legendG = g.append('g')
        .attr('transform', `translate(${width + 15}, 10)`);

      legendData.forEach((leg, index) => {
        const itemG = legendG.append('g')
          .attr('transform', `translate(0, ${index * 38})`);

        itemG.append('circle')
          .attr('r', 5)
          .attr('cx', 5)
          .attr('cy', 5)
          .style('fill', leg.color);

        itemG.append('text')
          .attr('x', 16)
          .attr('y', 9)
          .text(leg.label)
          .style('fill', '#e5e7eb') // gray-200
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('font-family', 'ui-sans-serif, system-ui, sans-serif');

        itemG.append('text')
          .attr('x', 16)
          .attr('y', 21)
          .text(leg.desc)
          .style('fill', '#9ca3af') // gray-400
          .style('font-size', '9px')
          .style('font-family', 'ui-sans-serif, system-ui, sans-serif');
      });
    }

    // Interactive Hover Tracking Focus Group
    const hoverFocus = g.append('g')
      .attr('class', 'hover-focus')
      .style('display', 'none');

    // Stalk tracking line
    hoverFocus.append('line')
      .attr('class', 'track-line')
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#6b7280') // gray-500
      .style('stroke-opacity', 0.6)
      .style('stroke-dasharray', '2,2');

    // Bullet nodes on the lines
    hoverFocus.append('circle')
      .attr('class', 'track-canopy')
      .attr('r', 5)
      .style('fill', '#10b981')
      .style('stroke', '#111827')
      .style('stroke-width', 2);

    hoverFocus.append('circle')
      .attr('class', 'track-root')
      .attr('r', 5)
      .style('fill', '#f59e0b')
      .style('stroke', '#111827')
      .style('stroke-width', 2);

    hoverFocus.append('circle')
      .attr('class', 'track-yield')
      .attr('r', 5)
      .style('fill', '#3b82f6')
      .style('stroke', '#111827')
      .style('stroke-width', 2);

    let isFirstHover = true;

    // Overlay catcher for interactions
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => {
        hoverFocus.style('display', null);
        isFirstHover = true;
      })
      .on('mouseleave', () => {
        hoverFocus.style('display', 'none');
        setActiveHoverData(null);
      })
      .on('mousemove', function(event) {
        const mouseX = d3.pointer(event)[0];
        const weekCoord = x.invert(mouseX);

        // Bisect to fetch the matching week
        let targetIdx = 0;
        let deltaMin = Infinity;
        data.forEach((dItem, idx) => {
          const delta = Math.abs(dItem.week - weekCoord);
          if (delta < deltaMin) {
            deltaMin = delta;
            targetIdx = idx;
          }
        });

        const activeItem = data[targetIdx];
        setActiveHoverData(activeItem);

        if (isFirstHover) {
          // Snap instantly to the first position upon mouse entry
          hoverFocus.select('.track-line')
            .interrupt()
            .attr('x1', x(activeItem.week))
            .attr('x2', x(activeItem.week));

          hoverFocus.select('.track-canopy')
            .interrupt()
            .attr('cx', x(activeItem.week))
            .attr('cy', y(activeItem.canopy));

          hoverFocus.select('.track-root')
            .interrupt()
            .attr('cx', x(activeItem.week))
            .attr('cy', y(activeItem.root));

          hoverFocus.select('.track-yield')
            .interrupt()
            .attr('cx', x(activeItem.week))
            .attr('cy', y(activeItem.yieldPotential));

          isFirstHover = false;
        } else {
          // Glide smoothly with cubic easing on subsequent mouse coordinates
          hoverFocus.select('.track-line')
            .transition()
            .duration(150)
            .ease(d3.easeCubicOut)
            .attr('x1', x(activeItem.week))
            .attr('x2', x(activeItem.week));

          hoverFocus.select('.track-canopy')
            .transition()
            .duration(150)
            .ease(d3.easeCubicOut)
            .attr('cx', x(activeItem.week))
            .attr('cy', y(activeItem.canopy));

          hoverFocus.select('.track-root')
            .transition()
            .duration(150)
            .ease(d3.easeCubicOut)
            .attr('cx', x(activeItem.week))
            .attr('cy', y(activeItem.root));

          hoverFocus.select('.track-yield')
            .transition()
            .duration(150)
            .ease(d3.easeCubicOut)
            .attr('cx', x(activeItem.week))
            .attr('cy', y(activeItem.yieldPotential));
        }
      });

    // ─── USER DEFINED DRAGGABLE TARGET THRESHOLD REGION ───
    const metItem = data.find(d => d[thresholdMetric] >= targetThreshold);
    const targetMetWeek = metItem ? metItem.week : null;

    if (targetMetWeek !== null && metItem) {
      const metX = x(targetMetWeek);
      const metY = y(metItem[thresholdMetric]);

      // Draw subtle vertical reference line showing when target is bypassed
      g.append('line')
        .attr('class', 'target-met-v-line')
        .attr('x1', metX)
        .attr('x2', metX)
        .attr('y1', metY)
        .attr('y2', height)
        .style('stroke', '#f43f5e') // vibrant rose-500
        .style('stroke-opacity', 0.6)
        .style('stroke-dasharray', '3,3')
        .style('stroke-width', 1.5)
        .style('pointer-events', 'none');

      // Draw highlight outer halo circle at intersection
      g.append('circle')
        .attr('class', 'target-met-halo')
        .attr('cx', metX)
        .attr('cy', metY)
        .attr('r', 11)
        .style('fill', 'none')
        .style('stroke', '#f43f5e')
        .style('stroke-opacity', 0.45)
        .style('stroke-width', 2.5)
        .style('pointer-events', 'none');

      // Draw highlight inner dot at intersection
      g.append('circle')
        .attr('class', 'target-met-dot')
        .attr('cx', metX)
        .attr('cy', metY)
        .attr('r', 5.5)
        .style('fill', '#f43f5e')
        .style('stroke', '#ffffff')
        .style('stroke-width', 2)
        .style('pointer-events', 'none');
    }

    const targetYVal = y(targetThreshold);

    const targetG = g.append('g')
      .attr('class', 'target-threshold-g')
      .style('cursor', 'ns-resize');

    // Draw the horizontal target threshold line itself
    targetG.append('line')
      .attr('class', 'threshold-h-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', targetYVal)
      .attr('y2', targetYVal)
      .style('stroke', '#f43f5e')
      .style('stroke-width', 2)
      .style('stroke-dasharray', '5,3')
      .style('stroke-opacity', 0.9);

    // Thick transparent overlay line to expand the hit/drag target area (extremely high usability!)
    targetG.append('line')
      .attr('class', 'threshold-drag-catcher')
      .attr('x1', -20)
      .attr('x2', width + 20)
      .attr('y1', targetYVal)
      .attr('y2', targetYVal)
      .style('stroke', 'transparent')
      .style('stroke-width', 16)
      .style('pointer-events', 'all');

    // Drag handle pill structure
    const handleW = isSmall ? 40 : 85;
    const handleH = 20;
    const handleX = width - handleW;

    targetG.append('rect')
      .attr('class', 'threshold-handle')
      .attr('x', handleX)
      .attr('y', targetYVal - handleH / 2)
      .attr('width', handleW)
      .attr('height', handleH)
      .attr('rx', 4)
      .style('fill', '#f43f5e')
      .style('stroke', '#ffe4e6')
      .style('stroke-opacity', 0.45)
      .style('stroke-width', 1)
      .style('pointer-events', 'all')
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))');

    targetG.append('text')
      .attr('class', 'threshold-label-text')
      .attr('x', handleX + handleW / 2)
      .attr('y', targetYVal + 3.5)
      .attr('text-anchor', 'middle')
      .text(`🎯 ${targetThreshold}%`)
      .style('fill', '#ffffff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .style('pointer-events', 'none');

    // Attach d3 drag capability
    const dragBehavior = d3.drag<SVGGElement, unknown>()
      .on('start', function() {
        d3.select(this).select('.threshold-handle').style('fill', '#e11d48');
      })
      .on('drag', function(event) {
        const clYVal = Math.max(0, Math.min(height, event.y));
        const computedPercent = Math.round(y.invert(clYVal));
        setTargetThreshold(Math.max(0, Math.min(100, computedPercent)));
      })
      .on('end', function() {
        d3.select(this).select('.threshold-handle').style('fill', '#f43f5e');
      });

    targetG.call(dragBehavior);

  }, [cropName, dimensions, showPreviousSeason, showWeatherOverlay, weatherImpactHighlights, targetThreshold, thresholdMetric]);

  const maxDuration = generateGrowthData(cropName).length - 1;
  const prevData = showPreviousSeason ? generatePreviousSeasonData(cropName) : [];
  const activePrevItem = showPreviousSeason && activeHoverData 
    ? prevData.find(pd => pd.week === activeHoverData.week) 
    : null;

  const data = generateGrowthData(cropName);
  const metWeeklyItem = data.find(d => d[thresholdMetric] >= targetThreshold);
  const targetMetWeek = metWeeklyItem ? metWeeklyItem.week : null;

  return (
    <div className="GrowthTimelineChart bg-gray-800/40 border border-gray-700/60 p-4 rounded-xl mt-6">
      {/* Target Threshold Interactive Configuration Control Grid */}
      <div className="bg-gray-900/30 border border-gray-700/40 px-3.5 py-3 rounded-lg mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 shrink-0">
            <span>🎯</span> Target Analyzer:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Metric Indicator</span>
            <select
              value={thresholdMetric}
              onChange={(e) => setThresholdMetric(e.target.value as any)}
              className="bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs rounded border border-gray-700 p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
            >
              <option value="canopy">🌱 Canopy Cover (%)</option>
              <option value="root">🥕 Root Depth (%)</option>
              <option value="yieldPotential">🌾 Yield Quality (%)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Target Value</span>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="5"
                max="95"
                step="5"
                value={targetThreshold}
                onChange={(e) => setTargetThreshold(Number(e.target.value))}
                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <span className="text-xs font-bold font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/15">
                {targetThreshold}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-950/40 px-3 py-1.5 rounded-md border border-gray-800 flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-400">Goal Status</span>
          {targetMetWeek !== null ? (
            <span className="text-xs text-rose-300 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              Met in <strong className="text-white font-black">Week {targetMetWeek}</strong> ({data.find(d => d.week === targetMetWeek)?.stage || 'N/A'})
            </span>
          ) : (
            <span className="text-xs text-gray-500 font-semibold italic">
              Threshold unmet on current curve
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 pb-2 border-b border-gray-700/30 gap-4">
        <div>
          <h4 className="text-gray-100 font-semibold text-base flex items-center gap-1.5">
            <span className="text-green-400">📊</span>
            <span>{cropName} Projected Growth Curve</span>
          </h4>
          <p className="text-gray-400 text-xs mt-0.5">Projected biological progression plan over {maxDuration} weeks</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs w-full lg:w-auto justify-between lg:justify-end">
          {/* Weather Predictions Toggle Switch */}
          {location && (
            <div className="flex items-center gap-2.5 bg-gray-900/40 px-3 py-1.5 rounded-lg border border-gray-700/60 hover:bg-gray-900/60 transition-all duration-150 select-none">
              <span className="text-gray-300 font-medium text-xs flex items-center gap-1.5">
                <span>⛈️</span> Live Weather Overlay
              </span>
              <button
                type="button"
                id="toggleWeatherOverlay"
                role="switch"
                aria-checked={showWeatherOverlay}
                onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showWeatherOverlay ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showWeatherOverlay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Previous Season Toggle Switch */}
          <div className="flex items-center gap-2.5 bg-gray-900/40 px-3 py-1.5 rounded-lg border border-gray-700/60 hover:bg-gray-900/60 transition-all duration-150 select-none">
            <span className="text-gray-300 font-medium text-xs flex items-center gap-1.5">
              <span>📅</span> Compare Previous Season
            </span>
            <button
              type="button"
              id="togglePrevSeason"
              role="switch"
              aria-checked={showPreviousSeason}
              onClick={() => setShowPreviousSeason(!showPreviousSeason)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showPreviousSeason ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  showPreviousSeason ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:border-l lg:border-gray-750 lg:pl-4 py-0.5">
            <span className="inline-flex items-center gap-1.5 text-gray-300 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Canopy
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-300 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Roots
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-300 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              Yield
            </span>
            {showPreviousSeason && (
              <span className="inline-flex items-center gap-1.5 text-gray-400 font-mono border-l border-gray-700 pl-2">
                <span className="w-3 border-t border-dashed border-gray-400 inline-block"></span>
                Last Season
              </span>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="mx-auto block"
        />

        {/* Hover interaction floating card info or state indicator */}
        {activeHoverData ? (
          <div className="mt-3 bg-gray-900/80 border border-emerald-500/20 p-3 rounded-lg flex flex-col backdrop-blur-sm shadow-md transition-all duration-150">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 w-full">
              <div>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider font-mono">Week {activeHoverData.week} Progress:</span>
                <span className="ml-1.5 text-emerald-400 text-sm font-semibold">{activeHoverData.stage}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-mono">
                <span className="text-gray-300">
                  Canopy Cover: <strong className="text-emerald-400">{activeHoverData.canopy}%</strong>
                  {activePrevItem && (
                    <span className="text-emerald-500 text-[10px] ml-1">
                      (vs <strong className="font-semibold text-emerald-400">{activePrevItem.canopy}%</strong> L/S)
                    </span>
                  )}
                </span>
                <span className="text-gray-300">
                  Root System: <strong className="text-amber-400">{activeHoverData.root}%</strong>
                  {activePrevItem && (
                    <span className="text-amber-500 text-[10px] ml-1">
                      (vs <strong className="font-semibold text-amber-500">{activePrevItem.root}%</strong> L/S)
                    </span>
                  )}
                </span>
                <span className="text-gray-300">
                  Yield Quality: <strong className="text-blue-400">{activeHoverData.yieldPotential}%</strong>
                  {activePrevItem && (
                    <span className="text-blue-400 text-[10px] ml-1">
                      (vs <strong className="font-semibold text-blue-400">{activePrevItem.yieldPotential}%</strong> L/S)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* If any live weather warning affects the current active hovered week */}
            {showWeatherOverlay && weatherImpactHighlights.some(wh => activeHoverData.week >= wh.weekStart && activeHoverData.week <= wh.weekEnd) && (
              <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 flex flex-col gap-2">
                {weatherImpactHighlights
                  .filter(wh => activeHoverData.week >= wh.weekStart && activeHoverData.week <= wh.weekEnd)
                  .map((wh, idx) => (
                    <div 
                      key={idx}
                      className="text-xs flex flex-col md:flex-row md:items-start md:justify-between bg-amber-950/20 text-amber-300 border border-amber-500/15 p-2.5 rounded-lg gap-2 text-left"
                    >
                      <div className="flex-1">
                        <span className="font-bold uppercase tracking-wide inline-flex items-center gap-1.5 text-amber-400">
                          <span>⛈️ Weather Threat Alert:</span> {wh.title}
                        </span>
                        <p className="text-gray-300 mt-1 leading-relaxed text-[11px]">{wh.description}</p>
                      </div>
                      <div className="md:w-64 text-[10px] bg-amber-500/10 px-2 py-1.5 rounded leading-relaxed shrink-0 text-amber-300 border border-amber-500/10 self-stretch md:self-start md:text-left font-medium">
                        <span className="font-semibold block text-amber-400 uppercase text-[9px] tracking-wider mb-0.5">Recommended Field Action</span>
                        {wh.vulnerabilityMsg}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 py-1.5 text-center text-xs text-gray-400/80 font-medium tracking-wide flex items-center justify-center gap-1.5 border border-dashed border-gray-750 rounded-lg">
            <span>🖱️</span> Hover/drag over the chart to track interactive timeline and growth stats.
          </div>
        )}
      </div>

      {/* Temperature stress indicators panel */}
      <div className="mt-5 pt-4 border-t border-gray-700/30">
        <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Crop Critical Thermal Vulnerability Windows</span>
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {getCropStressPeriods(cropName).map((period, index) => {
            const isHoveredActive = activeHoverData 
              ? activeHoverData.week >= period.startWeek && activeHoverData.week <= period.endWeek
              : false;

            return (
              <div 
                key={index}
                className={`p-3.5 rounded-lg border transition-all duration-200 bg-gray-900/35 flex flex-col justify-between ${
                  isHoveredActive 
                    ? 'border-rose-500/40 ring-1 ring-rose-500/15 scale-[1.01] bg-rose-950/10' 
                    : 'border-gray-750/70 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-gray-500">
                        Critical Duration: Wk {period.startWeek} - Wk {period.endWeek}
                      </span>
                      <h6 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: period.color }}></span>
                        {period.stageName} Phase
                      </h6>
                    </div>
                    <div 
                      className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider select-none shrink-0"
                      style={{ backgroundColor: `${period.color}15`, color: period.color, border: `1px solid ${period.color}25` }}
                    >
                      {period.stressType}
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs mt-2.5 leading-relaxed">
                    {period.description}
                  </p>
                </div>

                {isHoveredActive && (
                  <div className="mt-3 pt-2.5 border-t border-rose-500/10 flex items-center gap-1.5 text-[10px] text-rose-400 font-semibold font-mono animate-pulse">
                    <span>⚡</span> Week {activeHoverData?.week} lies inside this critical stress window!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Weather Forecast and Alerts Overlay Section */}
      {location && (
        <div className="mt-6 pt-5 border-t border-gray-700/35">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
            <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌦️</span>
              <span>Live Weather Risks & Predictions ({location})</span>
            </h5>
            
            {loadingWeather && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1 animate-pulse font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block min-w-1.5 min-h-1.5 max-w-1.5 max-h-1.5" />
                Updating live climate risks...
              </span>
            )}
          </div>

          {weatherForecast && weatherForecast.forecast ? (
            <div>
              {/* Short forecast day panels */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                {weatherForecast.forecast.map((day: any, idx: number) => {
                  const hasRisk = day.description.toLowerCase().includes('frost') || 
                                  day.description.toLowerCase().includes('freeze') || 
                                  parseFloat(day.high) >= 90 || 
                                  parseFloat(day.low) <= 32 ||
                                  day.description.toLowerCase().includes('storm') || 
                                  day.description.toLowerCase().includes('heavy rain') ||
                                  parseFloat(day.wind) >= 20;
                  return (
                    <div 
                      key={idx} 
                      className={`p-2 rounded bg-gray-900/30 border text-center transition-all duration-150 ${
                        hasRisk 
                          ? 'border-amber-500/25 bg-amber-950/5 text-amber-200' 
                          : 'border-gray-800/80 hover:border-gray-750'
                      }`}
                    >
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day.day}</p>
                      <p className="text-xs font-semibold mt-1 leading-tight text-gray-200 truncate" title={day.description}>{day.description}</p>
                      <p className="text-xs font-bold font-mono mt-1 text-emerald-400">{day.high}/{day.low}</p>
                    </div>
                  );
                })}
              </div>

              {/* Weather Risks / Timeline impact list */}
              {weatherImpactHighlights.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-400 leading-normal">
                    The forecasted weather patterns correlate to specific vulnerable weeks in the <strong className="text-emerald-400">{cropName}</strong> biological cultivation timeline:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {weatherImpactHighlights.map((wh, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-950/5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2 pb-1.5 border-b border-amber-500/10">
                            <div>
                              <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">
                                Impact Period: Weeks {wh.weekStart} - {wh.weekEnd}
                              </span>
                              <h6 className="text-xs font-bold text-gray-200 mt-0.5">{wh.title}</h6>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono italic shrink-0">
                              Triggered by: {wh.forecastSource}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-gray-300 leading-relaxed">{wh.description}</p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-amber-500/10 text-[10px] text-amber-300 flex items-start gap-1.5">
                          <span className="font-bold shrink-0">💡 Field Fix:</span>
                          <span className="leading-normal">{wh.vulnerabilityMsg}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-emerald-500/15 bg-emerald-950/5 text-xs text-emerald-300 flex items-center gap-2.5">
                  <span className="text-base">☀️</span>
                  <div>
                    <strong className="font-bold">No High-Risk Weather Events Forecasted:</strong> The 7-day weather outlook is favorable! No critical biological stress zones match the predicted forecast for this location.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-gray-900/40 text-center text-xs text-gray-400 border border-dashed border-gray-750">
              {loadingWeather ? 'Parsing weather timelines...' : 'Failed to query live climate projections.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
