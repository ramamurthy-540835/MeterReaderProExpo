import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera/legacy';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const OCR_API = 'https://ocr-api-1092842265567.us-central1.run.app';
const ANALYSIS_API = 'https://power-analysis-api-1092842265567.us-central1.run.app';
const GEMINI_API_KEY = 'AIzaSyAfAOwK1c2liSC1BYpNq-7k824VZV4j3kw';
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// TANGEDCO Tariff (Domestic LT I - 0-500 units)
const TARIFF = {
  0: 0,      // First 100 units free
  100: 0,    // Next 100 units free  
  200: 2.5,  // 101-200: ₹2.50/unit
  500: 3.0,  // 201-500: ₹3.00/unit
  above: 5.0 // Above 500: ₹5.00/unit
};

const APPLIANCE_DEFAULTS = {
  'air conditioner': { watts: 1500, hours: 6, icon: '❄️' },
  'ac': { watts: 1500, hours: 6, icon: '❄️' },
  'split ac': { watts: 1500, hours: 6, icon: '❄️' },
  'window ac': { watts: 1200, hours: 6, icon: '❄️' },
  'refrigerator': { watts: 150, hours: 24, icon: '🧊' },
  'fridge': { watts: 150, hours: 24, icon: '🧊' },
  'ceiling fan': { watts: 75, hours: 10, icon: '🌀' },
  'fan': { watts: 75, hours: 10, icon: '🌀' },
  'table fan': { watts: 50, hours: 8, icon: '🌀' },
  'exhaust fan': { watts: 40, hours: 2, icon: '🌀' },
  'washing machine': { watts: 500, hours: 1, icon: '🧺' },
  'washer': { watts: 500, hours: 1, icon: '🧺' },
  'television': { watts: 100, hours: 6, icon: '📺' },
  'tv': { watts: 100, hours: 6, icon: '📺' },
  'led light': { watts: 10, hours: 6, icon: '💡' },
  'led': { watts: 10, hours: 6, icon: '💡' },
  'led bulb': { watts: 10, hours: 6, icon: '💡' },
  'light': { watts: 10, hours: 6, icon: '💡' },
  'bulb': { watts: 10, hours: 6, icon: '💡' },
  'cfl': { watts: 15, hours: 6, icon: '💡' },
  'cfl bulb': { watts: 15, hours: 6, icon: '💡' },
  'tube light': { watts: 40, hours: 6, icon: '💡' },
  'tubelight': { watts: 40, hours: 6, icon: '💡' },
  'zero watt bulb': { watts: 15, hours: 6, icon: '💡' },
  'zero watt': { watts: 15, hours: 6, icon: '💡' },
  'night lamp': { watts: 5, hours: 10, icon: '💡' },
  'water heater': { watts: 2000, hours: 1, icon: '♨️' },
  'geyser': { watts: 2000, hours: 1, icon: '♨️' },
  'heater': { watts: 2000, hours: 1, icon: '♨️' },
  'microwave': { watts: 1000, hours: 0.5, icon: '📦' },
  'oven': { watts: 1200, hours: 0.5, icon: '📦' },
  'rice cooker': { watts: 500, hours: 2, icon: '🍚' },
  'cooker': { watts: 500, hours: 2, icon: '🍚' },
  'induction': { watts: 2000, hours: 2, icon: '🔥' },
  'induction stove': { watts: 2000, hours: 2, icon: '🔥' },
  'induction cooktop': { watts: 2000, hours: 2, icon: '🔥' },
  'gas stove': { watts: 0, hours: 0, icon: '🔥' },
  'mixer': { watts: 500, hours: 0.5, icon: '🥣' },
  'grinder': { watts: 500, hours: 0.5, icon: '🥣' },
  'mixer grinder': { watts: 500, hours: 0.5, icon: '🥣' },
  'blender': { watts: 400, hours: 0.3, icon: '🥣' },
  'iron': { watts: 1000, hours: 0.5, icon: '🔥' },
  'iron box': { watts: 1000, hours: 0.5, icon: '🔥' },
  'laptop': { watts: 65, hours: 8, icon: '💻' },
  'computer': { watts: 300, hours: 8, icon: '💻' },
  'desktop': { watts: 300, hours: 8, icon: '💻' },
  'pc': { watts: 300, hours: 8, icon: '💻' },
  'monitor': { watts: 40, hours: 8, icon: '💻' },
  'router': { watts: 10, hours: 24, icon: '📡' },
  'wifi router': { watts: 10, hours: 24, icon: '📡' },
  'water pump': { watts: 750, hours: 0.5, icon: '💧' },
  'pump': { watts: 750, hours: 0.5, icon: '💧' },
  'motor': { watts: 750, hours: 0.5, icon: '💧' },
  'aquarium': { watts: 50, hours: 24, icon: '🐠' },
  'air purifier': { watts: 50, hours: 12, icon: '🌬️' },
  'air cooler': { watts: 200, hours: 8, icon: '🌬️' },
  'cooler': { watts: 200, hours: 8, icon: '🌬️' },
  'stabilizer': { watts: 20, hours: 24, icon: '⚡' },
  'ups': { watts: 50, hours: 24, icon: '⚡' },
  'set top box': { watts: 15, hours: 6, icon: '📺' },
  'dtv': { watts: 15, hours: 6, icon: '📺' },
};

const MANUAL_CATEGORIES = [
  { id: 'ac', name: 'Air Conditioner', icon: '❄️', avgWatts: 1500, hours: 6 },
  { id: 'fridge', name: 'Refrigerator', icon: '🧊', avgWatts: 150, hours: 24 },
  { id: 'washing_machine', name: 'Washing Machine', icon: '🧺', avgWatts: 500, hours: 1 },
  { id: 'tv', name: 'Television', icon: '📺', avgWatts: 100, hours: 6 },
  { id: 'fan', name: 'Ceiling Fan', icon: '🌀', avgWatts: 75, hours: 10 },
  { id: 'led', name: 'LED Bulb', icon: '💡', avgWatts: 10, hours: 6 },
  { id: 'tube_light', name: 'Tube Light', icon: '💡', avgWatts: 40, hours: 6 },
  { id: 'zero_watt', name: 'Zero Watt Bulb', icon: '💡', avgWatts: 15, hours: 6 },
  { id: 'cfl', name: 'CFL Bulb', icon: '💡', avgWatts: 15, hours: 6 },
  { id: 'heater', name: 'Water Heater', icon: '♨️', avgWatts: 2000, hours: 1 },
  { id: 'microwave', name: 'Microwave', icon: '📦', avgWatts: 1000, hours: 0.5 },
  { id: 'rice_cooker', name: 'Rice Cooker', icon: '🍚', avgWatts: 500, hours: 2 },
  { id: 'induction', name: 'Induction Stove', icon: '🔥', avgWatts: 2000, hours: 2 },
  { id: 'mixer', name: 'Mixer Grinder', icon: '🥣', avgWatts: 500, hours: 0.5 },
  { id: 'iron', name: 'Iron', icon: '🔥', avgWatts: 1000, hours: 0.5 },
  { id: 'laptop', name: 'Laptop', icon: '💻', avgWatts: 65, hours: 8 },
  { id: 'desktop', name: 'Desktop PC', icon: '💻', avgWatts: 300, hours: 8 },
  { id: 'router', name: 'WiFi Router', icon: '📡', avgWatts: 10, hours: 24 },
  { id: 'pump', name: 'Water Pump', icon: '💧', avgWatts: 750, hours: 0.5 },
  { id: 'cooler', name: 'Air Cooler', icon: '🌬️', avgWatts: 200, hours: 8 },
];

// Calculate bill based on TANGEDCO tariff
const calculateBill = (units) => {
  let bill = 0;
  if (units <= 100) return 0;
  if (units <= 200) return (units - 100) * 2.5;
  if (units <= 500) return (100 * 2.5) + ((units - 200) * 3.0);
  return (100 * 2.5) + (300 * 3.0) + ((units - 500) * 5.0);
};

export default function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [appliances, setAppliances] = useState([]);
  const [showApplianceModal, setShowApplianceModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);
  const [meterReadings, setMeterReadings] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [activeView, setActiveView] = useState('profile');
  const [cameraMode, setCameraMode] = useState('meter');
  const [detectingAppliances, setDetectingAppliances] = useState(false);
  const [billingDays, setBillingDays] = useState(15); // Default 15 days
  const [apiStatus, setApiStatus] = useState('testing'); // testing, connected, failed

  const testAPIConnection = async () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🔌 TESTING API CONNECTION');
    console.log('═══════════════════════════════════════');
    console.log('⏰ Starting connection test...');
    
    const startTime = Date.now();
    
    try {
      console.log('');
      console.log('🌐 Sending test request to Gemini API...');
      console.log(`📍 URL: ${GEMINI_API}`);
      console.log(`🔑 Key: ${GEMINI_API_KEY.substring(0, 20)}...`);
      
      const response = await axios.post(GEMINI_API, {
        contents: [{
          parts: [{
            text: "Say 'API Connected' if you can read this."
          }]
        }]
      }, { 
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('');
      console.log(`✅ RESPONSE RECEIVED in ${elapsed}s`);
      console.log('📦 Status:', response.status);
      console.log('📊 Data:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 200 && response.data.candidates) {
        console.log('');
        console.log('✅✅✅ API CONNECTION SUCCESSFUL ✅✅✅');
        console.log(`⚡ Response time: ${elapsed}s`);
        console.log('🎯 Gemini API is working perfectly!');
        console.log('═══════════════════════════════════════');
        setApiStatus('connected');
        return true;
      } else {
        console.log('');
        console.log('⚠️ UNEXPECTED RESPONSE FORMAT');
        console.log('═══════════════════════════════════════');
        setApiStatus('failed');
        return false;
      }
      
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.error('');
      console.error('❌❌❌ API CONNECTION FAILED ❌❌❌');
      console.error('═══════════════════════════════════════');
      console.error(`⏱️ Time: ${elapsed}s`);
      console.error('🔴 Error:', error.name);
      console.error('📝 Message:', error.message);
      console.error('🔍 Code:', error.code);
      
      if (error.response) {
        console.error('');
        console.error('📦 Server Response:');
        console.error('  Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  Data:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 400) {
          console.error('');
          console.error('💡 POSSIBLE CAUSES:');
          console.error('  - Invalid API key');
          console.error('  - Malformed request');
          console.error('  - API version mismatch');
        } else if (error.response.status === 403) {
          console.error('');
          console.error('💡 POSSIBLE CAUSES:');
          console.error('  - API key not authorized');
          console.error('  - Quota exceeded');
          console.error('  - API disabled');
        } else if (error.response.status === 429) {
          console.error('');
          console.error('💡 POSSIBLE CAUSES:');
          console.error('  - Rate limit exceeded');
          console.error('  - Too many requests');
        }
        
      } else if (error.request) {
        console.error('');
        console.error('📡 Network Issue:');
        console.error('  Request sent but no response');
        console.error('');
        console.error('💡 POSSIBLE CAUSES:');
        console.error('  - No internet connection');
        console.error('  - Firewall blocking request');
        console.error('  - API endpoint down');
        console.error('  - DNS resolution failed');
        console.error('  - Timeout (network too slow)');
        
      } else {
        console.error('');
        console.error('⚙️ Request Setup Error');
        console.error('  Error before sending request');
      }
      
      console.error('');
      console.error('🔧 Full Stack:');
      console.error(error.stack);
      console.error('═══════════════════════════════════════');
      
      setApiStatus('failed');
      return false;
    }
  };

  useEffect(() => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🚀 INSTINCT 4.0 APP STARTING');
    console.log('═══════════════════════════════════════');
    console.log('📅 Date:', new Date().toLocaleString());
    console.log('');
    console.log('🔧 API CONFIGURATION:');
    console.log(`  OCR API: ${OCR_API}`);
    console.log(`  Analysis API: ${ANALYSIS_API}`);
    console.log(`  Gemini API: ${GEMINI_API}`);
    console.log(`  API Key: ${GEMINI_API_KEY.substring(0, 20)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 10)}`);
    console.log('');
    console.log('⚙️ FEATURES:');
    console.log('  ✅ AI Appliance Detection (Gemini Vision)');
    console.log('  ✅ Meter OCR (Gemini Vision)');
    console.log('  ✅ Manual Entry Fallback');
    console.log('  ✅ TANGEDCO Tariff Calculation');
    console.log('  ✅ Cost Prediction per Device');
    console.log('  ✅ PDF Report Generation');
    console.log('  ✅ Billing Days: 15/30/60');
    console.log('');
    console.log('⏱️ TIMEOUTS:');
    console.log('  Meter OCR: 15 seconds');
    console.log('  Appliance Detection: 15 seconds');
    console.log('');
    
    (async () => {
      console.log('🔐 Requesting camera permissions...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log(`  Camera Permission: ${status === 'granted' ? '✅ GRANTED' : '❌ DENIED'}`);
      setHasPermission(status === 'granted');
      
      console.log('');
      console.log('💾 Loading saved data from AsyncStorage...');
      
      const profile = await AsyncStorage.getItem('userProfile');
      if (profile) {
        const parsed = JSON.parse(profile);
        console.log(`  ✅ Profile loaded: ${parsed.name} (${parsed.customerId})`);
        setUserProfile(parsed);
        setActiveView('appliances');
      } else {
        console.log('  ⚠️ No profile found - showing profile form');
      }
      
      const savedAppliances = await AsyncStorage.getItem('appliances');
      if (savedAppliances) {
        const parsed = JSON.parse(savedAppliances);
        console.log(`  ✅ Appliances loaded: ${parsed.length} items`);
        setAppliances(parsed);
      } else {
        console.log('  ⚠️ No appliances found');
      }

      const savedReadings = await AsyncStorage.getItem('meterReadings');
      if (savedReadings) {
        const parsed = JSON.parse(savedReadings);
        console.log(`  ✅ Meter readings loaded: ${parsed.length} readings`);
        setMeterReadings(parsed);
      } else {
        console.log('  ⚠️ No meter readings found');
      }
      
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('✅ APP READY');
      console.log('═══════════════════════════════════════');
      console.log('');
      
      // Test API Connection automatically on startup
      console.log('🔌 Running automatic API connection test...');
      const connected = await testAPIConnection();
      
      if (connected) {
        Alert.alert('✅ API Connected', 
          'Gemini Vision API is working!\n\nYou can now use:\n• AI Appliance Detection\n• Meter OCR',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ API Connection Failed', 
          'Cannot connect to Gemini API.\n\nPlease check:\n• Internet connection\n• API key validity\n• Network settings\n\nYou can still use manual entry.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  const saveProfile = async (profile) => {
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    setUserProfile(profile);
    setActiveView('appliances');
    Alert.alert('✅ Saved', 'Profile saved successfully!');
  };

  const addAppliance = async (appliance) => {
    const newAppliances = [...appliances, { ...appliance, id: Date.now() }];
    setAppliances(newAppliances);
    await AsyncStorage.setItem('appliances', JSON.stringify(newAppliances));
    setShowApplianceModal(false);
    Alert.alert('✅ Added', `${appliance.name} added successfully`);
  };

  const addManualReading = async (reading) => {
    const newReadings = [...meterReadings, {
      ...reading,
      timestamp: new Date().toISOString(),
      source: 'manual'
    }];
    setMeterReadings(newReadings);
    await AsyncStorage.setItem('meterReadings', JSON.stringify(newReadings));
    setShowManualEntryModal(false);
    
    // Calculate cost for this reading
    if (newReadings.length >= 2) {
      const prevReading = newReadings[newReadings.length - 2];
      const consumption = Math.abs(reading.kWh - prevReading.kWh);
      const cost = calculateBill(consumption);
      
      Alert.alert('✅ Saved!', 
        `Meter reading saved!\n\n` +
        `Consumption: ${consumption.toFixed(2)} kWh\n` +
        `Estimated Cost: ₹${cost.toFixed(2)} for ${billingDays} days`
      );
    } else {
      Alert.alert('✅ Saved', 'First reading recorded!');
    }
  };

  const detectAppliances = async () => {
    if (!cameraRef.current) {
      Alert.alert('⚠️ Camera Not Ready', 'Please wait for camera to initialize');
      return;
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🤖 AI APPLIANCE DETECTION STARTED');
    console.log('═══════════════════════════════════════');
    
    setDetectingAppliances(true);
    const startTime = Date.now();
    
    // 15-SECOND TIMEOUT for appliance detection
    const timeoutId = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`⏱️ TIMEOUT REACHED after ${elapsed}s`);
      if (detectingAppliances) {
        setDetectingAppliances(false);
        Alert.alert('⏱️ Timeout', 'AI detection taking too long. Please add appliances manually.', [
          { text: 'OK', onPress: () => setActiveView('appliances') }
        ]);
      }
    }, 15000);
    
    try {
      console.log('📸 Taking room photo...');
      const photoStartTime = Date.now();
      
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.7, // Higher quality for better detection
        base64: true,
      });
      
      const photoTime = ((Date.now() - photoStartTime) / 1000).toFixed(2);
      console.log(`✅ Photo captured in ${photoTime}s`);
      console.log(`📏 Base64 length: ${photo.base64?.length || 0} chars`);
      console.log(`📊 Quality: 0.7 (high quality for detection)`);
      
      console.log('');
      console.log('🌐 CALLING GEMINI VISION API FOR APPLIANCE DETECTION...');
      console.log(`📍 API URL: ${GEMINI_API}`);
      console.log(`🔑 API Key: ${GEMINI_API_KEY.substring(0, 20)}...`);
      console.log('⏰ Request timeout: 8 seconds');
      console.log('');
      
      const apiStartTime = Date.now();
      
      const response = await axios.post(GEMINI_API, {
        contents: [{
          parts: [
            {
              text: `You are an EXPERT Indian household electrical appliance detector specialized in TANGEDCO electricity consumption analysis.

🔍 SYSTEMATIC ANALYSIS PROCESS (Follow Step-by-Step):

STEP 1 - CEILING SCAN:
• Look for: ceiling fans, tube lights, LED panels, decorative lights
• Count exact quantity of each type

STEP 2 - WALL SCAN:
• Look for: AC units (split/window), wall-mounted lights, geysers, exhaust fans
• Count exact quantity of each type

STEP 3 - FLOOR & CORNERS SCAN:
• Look for: refrigerators, washing machines, air coolers, water pumps
• Count exact quantity of each type

STEP 4 - FURNITURE & TABLES SCAN:
• Look for: TVs, laptops, table fans, WiFi routers, set-top boxes
• Count exact quantity of each type

STEP 5 - KITCHEN SCAN (if visible):
• Look for: microwave, induction cooktop, mixer grinder, rice cooker
• Count exact quantity of each type

📊 STANDARD INDIAN APPLIANCE WATTAGE DATABASE:

COOLING & VENTILATION:
ceiling fan: 75W | table fan: 50W | exhaust fan: 30W
split ac: 1500W | window ac: 1000W | air cooler: 200W

LIGHTING:
led bulb: 10W | cfl bulb: 15W | tube light: 40W | led panel: 20W

KITCHEN:
refrigerator: 150W (double door) or 100W (single door)
microwave: 1000W | induction cooktop: 2000W
mixer grinder: 500W | rice cooker: 500W | electric kettle: 1500W

HOME APPLIANCES:
led tv: 100W (43") or 60W (32")
washing machine: 500W | water heater: 2000W
iron: 1000W | water pump: 750W

ELECTRONICS:
laptop: 65W | desktop computer: 300W
wifi router: 10W | set-top box: 15W

✅ DETECTION RULES (CRITICAL):
1. ONLY include appliances you can CLEARLY see
2. Count ALL instances (if you see 3 ceiling fans → quantity: 3)
3. Use exact lowercase names from the database above
4. ALWAYS include "watts" field with exact wattage
5. If unsure about an appliance → DON'T include it
6. Be conservative → accuracy over quantity

📋 OUTPUT FORMAT (STRICT):
Return ONLY a valid JSON array. NO markdown, NO code blocks, NO explanation.

[
  {"name": "ceiling fan", "quantity": 2, "watts": 75},
  {"name": "led bulb", "quantity": 5, "watts": 10},
  {"name": "split ac", "quantity": 1, "watts": 1500},
  {"name": "refrigerator", "quantity": 1, "watts": 150}
]

If NO appliances visible → return: []

💡 EXAMPLE OUTPUTS:

Bedroom (2 fans, 4 LED bulbs):
[{"name":"ceiling fan","quantity":2,"watts":75},{"name":"led bulb","quantity":4,"watts":10}]

Living room (AC, TV, fridge):
[{"name":"split ac","quantity":1,"watts":1500},{"name":"led tv","quantity":1,"watts":100},{"name":"refrigerator","quantity":1,"watts":150}]

Kitchen (induction, mixer, fridge, 3 LED bulbs):
[{"name":"induction cooktop","quantity":1,"watts":2000},{"name":"mixer grinder","quantity":1,"watts":500},{"name":"refrigerator","quantity":1,"watts":100},{"name":"led bulb","quantity":3,"watts":10}]

NOW: Analyze THIS image systematically (Steps 1-5) and return the JSON array:`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: photo.base64
              }
            }
          ]
        }]
      }, { 
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const apiTime = ((Date.now() - apiStartTime) / 1000).toFixed(2);
      console.log(`✅ API RESPONSE RECEIVED in ${apiTime}s`);
      console.log('');
      console.log('📦 Response Status:', response.status);
      console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
      console.log('');

      clearTimeout(timeoutId);

      const text = response.data.candidates[0].content.parts[0].text.trim();
      console.log('📄 Extracted Text:', text);
      console.log('');
      
      let detectedAppliances = [];
      
      try {
        // Try to extract JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          console.log('🔍 JSON Array Found:', jsonMatch[0]);
          detectedAppliances = JSON.parse(jsonMatch[0]);
          console.log('✅ Parsed Appliances:', JSON.stringify(detectedAppliances, null, 2));
          console.log(`📊 Count: ${detectedAppliances.length} appliances detected`);
        } else {
          console.log('❌ NO JSON ARRAY FOUND in response');
        }
      } catch (e) {
        console.error('❌ JSON Parse Error:', e.message);
        console.log('Raw text:', text);
      }

      if (!detectedAppliances || detectedAppliances.length === 0) {
        console.log('');
        console.log('❌ NO APPLIANCES DETECTED');
        clearTimeout(timeoutId);
        setDetectingAppliances(false);
        Alert.alert('🔍 No Appliances Detected', 
          'AI could not detect any appliances in this photo.\n\nTips:\n' +
          '• Take photo in good lighting\n' +
          '• Show the full room\n' +
          '• Make sure appliances are visible\n' +
          '• Try different angle\n\n' +
          'Or add appliances manually.',
          [
            { text: 'Retry', onPress: () => setActiveView('camera') },
            { text: 'Add Manually', onPress: () => setActiveView('appliances') }
          ]
        );
        return;
      }

      console.log('');
      console.log('✅ PROCESSING DETECTED APPLIANCES:');
      let addedCount = 0;
      const newAppliances = [...appliances];
      const detectedNames = [];
      
      for (const detected of detectedAppliances) {
        if (!detected.name || !detected.quantity) {
          console.log(`⚠️ Skipping invalid entry:`, detected);
          continue;
        }
        
        const name = detected.name.toLowerCase().trim();
        const defaults = APPLIANCE_DEFAULTS[name] || { watts: 100, hours: 6, icon: '⚡' };
        
        console.log(`  ${addedCount + 1}. ${detected.name} (${detected.quantity}x) - ${defaults.watts}W, ${defaults.hours}hrs/day`);
        
        newAppliances.push({
          id: Date.now() + addedCount,
          category: name.replace(/\s+/g, '_'),
          name: detected.name,
          icon: defaults.icon,
          watts: defaults.watts,
          quantity: detected.quantity || 1,
          hoursPerDay: defaults.hours
        });
        
        detectedNames.push(`${detected.quantity}× ${detected.name}`);
        addedCount++;
      }
      
      if (addedCount === 0) {
        console.log('');
        console.log('❌ NO VALID APPLIANCES TO ADD');
        clearTimeout(timeoutId);
        setDetectingAppliances(false);
        Alert.alert('⚠️ Invalid Response', 'AI returned invalid data. Please add appliances manually.');
        setActiveView('appliances');
        return;
      }
      
      console.log('');
      console.log(`💾 Saving ${addedCount} appliances to AsyncStorage...`);
      setAppliances(newAppliances);
      await AsyncStorage.setItem('appliances', JSON.stringify(newAppliances));
      console.log('✅ Saved successfully');
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('');
      console.log(`⏱️ TOTAL TIME: ${totalTime}s`);
      console.log('═══════════════════════════════════════');
      console.log('✅ APPLIANCE DETECTION COMPLETE');
      console.log('═══════════════════════════════════════');
      
      clearTimeout(timeoutId);
      setDetectingAppliances(false);
      
      Alert.alert('✅ Detected Successfully!', 
        `Added ${addedCount} appliances:\n\n${detectedNames.join('\n')}`,
        [{ text: 'OK', onPress: () => setActiveView('appliances') }]
      );
      
    } catch (error) {
      clearTimeout(timeoutId);
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.error('');
      console.error('═══════════════════════════════════════');
      console.error('❌ ERROR IN APPLIANCE DETECTION');
      console.error('═══════════════════════════════════════');
      console.error('⏱️ Time elapsed:', totalTime + 's');
      console.error('🔴 Error type:', error.name);
      console.error('📝 Error message:', error.message);
      console.error('🔍 Error code:', error.code);
      
      if (error.response) {
        console.error('');
        console.error('📦 Response Error:');
        console.error('  Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('');
        console.error('📡 Request Error (no response):');
        console.error('  Request sent but no response received');
        console.error('  Possible causes: timeout, network issue, API down');
      } else {
        console.error('');
        console.error('⚙️ Setup Error:');
        console.error('  Error setting up request');
      }
      
      console.error('');
      console.error('🔧 Full Error Stack:');
      console.error(error.stack);
      console.error('═══════════════════════════════════════');
      
      setDetectingAppliances(false);
      
      Alert.alert('❌ Detection Failed', 
        `Error: ${error.message}\n\nPlease add appliances manually.`,
        [
          { text: 'Retry', onPress: () => setActiveView('camera') },
          { text: 'Add Manually', onPress: () => setActiveView('appliances') }
        ]
      );
    }
  };

  const takeMeterPhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('⚠️ Camera Not Ready', 'Please wait for camera to initialize');
      return;
    }
    
    console.log('═══════════════════════════════════════');
    console.log('🚀 METER PHOTO CAPTURE STARTED');
    console.log('═══════════════════════════════════════');
    
    setProcessing(true);
    const startTime = Date.now();
    
    // 10-SECOND OVERALL TIMEOUT - If anything hangs, show manual entry
    const overallTimeoutId = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`⏱️ OVERALL TIMEOUT REACHED after ${elapsed}s`);
      console.log('⚠️ Camera or API too slow - opening manual entry');
      setProcessing(false);
      Alert.alert('⏱️ Too Slow', 'Camera/OCR taking too long. Enter manually.', [
        { text: 'OK', onPress: () => setShowManualEntryModal(true) }
      ]);
    }, 10000);
    
    try {
      console.log('📸 Taking photo...');
      const photoStartTime = Date.now();
      
      // RACE: Camera capture vs 5-second timeout
      const photoPromise = cameraRef.current.takePictureAsync({ 
        quality: 0.2, // Lower quality for faster upload
        base64: true,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera timeout')), 5000)
      );
      
      const photo = await Promise.race([photoPromise, timeoutPromise]);
      
      const photoTime = ((Date.now() - photoStartTime) / 1000).toFixed(2);
      console.log(`✅ Photo captured in ${photoTime}s`);
      console.log(`📏 Base64 length: ${photo.base64?.length || 0} chars`);
      
      console.log('');
      console.log('🌐 CALLING GEMINI VISION API...');
      console.log(`📍 API URL: ${GEMINI_API}`);
      console.log(`🔑 API Key: ${GEMINI_API_KEY.substring(0, 20)}...`);
      console.log('⏰ Request timeout: 10 seconds');
      console.log('');
      
      const apiStartTime = Date.now();
      
      const response = await axios.post(GEMINI_API, {
        contents: [{
          parts: [
            {
              text: `Extract meter readings from this electricity meter image.
Return ONLY a JSON object in this exact format (no markdown):
{
  "serial": "meter serial number",
  "kWh": numeric kWh value,
  "kVAh": numeric kVAh value or null
}
Example: {"serial": "1067244", "kWh": 12050.5, "kVAh": 12500.2}
If cannot read, return: {"serial": "UNREADABLE", "kWh": 0, "kVAh": null}`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: photo.base64
              }
            }
          ]
        }]
      }, { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const apiTime = ((Date.now() - apiStartTime) / 1000).toFixed(2);
      console.log(`✅ API RESPONSE RECEIVED in ${apiTime}s`);
      console.log('');
      console.log('📦 Response Status:', response.status);
      console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
      console.log('');

      clearTimeout(overallTimeoutId);

      const text = response.data.candidates[0].content.parts[0].text.trim();
      console.log('📄 Extracted Text:', text);
      console.log('');
      
      let reading = null;
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('🔍 JSON Match Found:', jsonMatch[0]);
          reading = JSON.parse(jsonMatch[0]);
          console.log('✅ Parsed Reading:', JSON.stringify(reading, null, 2));
        } else {
          console.log('❌ NO JSON FOUND in response');
        }
      } catch (e) {
        console.error('❌ JSON Parse Error:', e.message);
        console.log('Raw text:', text);
      }

      console.log('');
      console.log('🔍 VALIDATION:');
      console.log(`  Serial: ${reading?.serial || 'MISSING'}`);
      console.log(`  kWh: ${reading?.kWh || 'MISSING'}`);
      console.log(`  kVAh: ${reading?.kVAh || 'MISSING'}`);

      if (!reading || reading.serial === 'UNREADABLE' || reading.kWh === 0) {
        console.log('');
        console.log('❌ VALIDATION FAILED - Opening manual entry');
        clearTimeout(overallTimeoutId);
        setProcessing(false);
        Alert.alert('❌ Cannot Read Meter', 'Could not extract readings. Please enter manually.', [
          { text: 'OK', onPress: () => setShowManualEntryModal(true) }
        ]);
        return;
      }

      console.log('');
      console.log('✅ VALIDATION PASSED - Saving reading');
      
      const newReadings = [...meterReadings, {
        ...reading,
        timestamp: new Date().toISOString(),
        source: 'camera'
      }];
      setMeterReadings(newReadings);
      await AsyncStorage.setItem('meterReadings', JSON.stringify(newReadings));
      
      console.log(`💾 Saved reading #${newReadings.length}`);
      
      // Calculate cost
      let costMsg = '';
      if (newReadings.length >= 2) {
        const prevReading = newReadings[newReadings.length - 2];
        const consumption = Math.abs(reading.kWh - prevReading.kWh);
        const cost = calculateBill(consumption);
        console.log(`💰 Consumption: ${consumption.toFixed(2)} kWh`);
        console.log(`💵 Cost: ₹${cost.toFixed(2)} for ${billingDays} days`);
        costMsg = `\n\nConsumption: ${consumption.toFixed(2)} kWh\nCost: ₹${cost.toFixed(2)} (${billingDays} days)`;
      }
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('');
      console.log(`⏱️ TOTAL TIME: ${totalTime}s`);
      console.log('═══════════════════════════════════════');
      console.log('✅ METER CAPTURE COMPLETE');
      console.log('═══════════════════════════════════════');
      
      clearTimeout(overallTimeoutId);
      setProcessing(false);
      
      Alert.alert('✅ Captured!', 
        `Serial: ${reading.serial}\n` +
        `kWh: ${reading.kWh}\n` +
        `kVAh: ${reading.kVAh || 'N/A'}${costMsg}`
      );
      
    } catch (error) {
      clearTimeout(overallTimeoutId);
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.error('');
      console.error('═══════════════════════════════════════');
      console.error('❌ ERROR OCCURRED');
      console.error('═══════════════════════════════════════');
      console.error('⏱️ Time elapsed:', totalTime + 's');
      console.error('🔴 Error type:', error.name);
      console.error('📝 Error message:', error.message);
      
      if (error.message === 'Camera timeout') {
        console.error('📸 Camera took too long to capture photo');
      }
      
      if (error.response) {
        console.error('');
        console.error('📦 Response Error:');
        console.error('  Status:', error.response.status);
        console.error('  Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('');
        console.error('📡 Request Error (no response)');
      }
      
      console.error('═══════════════════════════════════════');
      
      setProcessing(false);
      setShowManualEntryModal(true);
    }
  };

  const generateAnalysis = async () => {
    if (meterReadings.length < 1) {
      Alert.alert('⚠️ Need Data', 'Take at least 1 meter reading first');
      return;
    }

    try {
      setProcessing(true);
      
      const totalLoad = appliances.reduce((sum, app) => sum + (app.watts * app.quantity), 0);
      
      let consumption = 0;
      let cost = 0;
      let actualPeriodDays = billingDays;
      
      if (meterReadings.length >= 2) {
        // FIXED: Use LAST TWO readings, not first and last!
        const prevReading = parseFloat(meterReadings[meterReadings.length - 2].kWh || 0);
        const lastReading = parseFloat(meterReadings[meterReadings.length - 1].kWh || 0);
        consumption = Math.abs(lastReading - prevReading);
        
        // Calculate actual days between readings
        const prevDate = new Date(meterReadings[meterReadings.length - 2].timestamp);
        const lastDate = new Date(meterReadings[meterReadings.length - 1].timestamp);
        actualPeriodDays = Math.max(1, Math.round((lastDate - prevDate) / (1000 * 60 * 60 * 24)));
        
        cost = calculateBill(consumption);
        
        console.log('💡 Consumption Calculation:');
        console.log(`  Previous: ${prevReading} kWh`);
        console.log(`  Current: ${lastReading} kWh`);
        console.log(`  Consumption: ${consumption} kWh`);
        console.log(`  Days: ${actualPeriodDays}`);
        console.log(`  Cost: ₹${cost}`);
      } else {
        // Estimate based on appliances for billing period
        const dailyKwh = appliances.reduce((sum, app) => {
          return sum + ((app.watts * app.quantity * app.hoursPerDay) / 1000);
        }, 0);
        consumption = dailyKwh * billingDays;
        cost = calculateBill(consumption);
        actualPeriodDays = billingDays;
      }

      // Calculate per-device cost properly
      const deviceCosts = appliances.map(app => {
        const dailyKwh = (app.watts * app.quantity * app.hoursPerDay) / 1000;
        const monthlyKwh = dailyKwh * 30;
        const monthlyCost = calculateBill(monthlyKwh);
        const periodKwh = dailyKwh * actualPeriodDays;
        const periodCost = calculateBill(periodKwh);
        
        return {
          ...app,
          dailyKwh,
          monthlyKwh,
          monthlyCost: monthlyCost.toFixed(2),
          periodKwh: periodKwh.toFixed(2),
          periodCost: periodCost.toFixed(2)
        };
      }).sort((a, b) => b.monthlyKwh - a.monthlyKwh);

      const recommendations = {
        success: true,
        total_load_watts: totalLoad,
        consumption_kwh: consumption.toFixed(2),
        estimated_cost: cost.toFixed(2),
        billing_days: actualPeriodDays,
        readings_count: meterReadings.length,
        estimation_type: meterReadings.length >= 2 ? 'actual' : 'estimated',
        top_consumers: deviceCosts.slice(0, 5),
        ai_recommendations: {
          estimated_monthly_bill: (cost * (30 / actualPeriodDays)).toFixed(2),
          savings_potential: ((cost * 0.2) * (30 / actualPeriodDays)).toFixed(2),
          recommendations: [
            `Replace high-power devices (${deviceCosts[0]?.name}) with energy-efficient alternatives`,
            `Reduce AC/heater usage by 2 hours/day to save ₹${(deviceCosts.find(d => d.name.includes('AC') || d.name.includes('Heater'))?.monthlyCost * 0.25 || 200).toFixed(0)}/month`,
            `Switch to LED bulbs completely - potential savings ₹150/month`,
            `Use appliances during off-peak hours (10 PM - 6 AM) for lower rates`,
            `Install solar panels to offset ${(consumption * 0.3).toFixed(0)} kWh`
          ]
        }
      };

      setRecommendations(recommendations);
      setActiveView('analysis');
      
      if (meterReadings.length >= 2) {
        Alert.alert('✅ Analysis Ready!', 
          `Total Cost: ₹${cost.toFixed(2)}\n` +
          `Consumption: ${consumption.toFixed(2)} kWh\n` +
          `Period: ${actualPeriodDays} days (Actual)`
        );
      } else {
        Alert.alert('✅ Report Ready!', 
          `Estimated Cost: ₹${cost.toFixed(2)}\n` +
          `Estimated Usage: ${consumption.toFixed(2)} kWh\n` +
          `Period: ${actualPeriodDays} days\n\n` +
          `💡 Add 2nd reading for actual consumption`
        );
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('❌ Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadPDFReport = async () => {
    if (!recommendations) return;
    
    const ai = recommendations.ai_recommendations;
    const isActual = recommendations.estimation_type === 'actual';
    
    // PROFESSIONAL HTML REPORT
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TANGEDCO Power Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; margin-top: 10px; font-size: 12px; }
    .section { padding: 25px; border-bottom: 1px solid #e0e0e0; }
    .section:last-child { border-bottom: none; }
    .section-title { font-size: 20px; color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 3px solid #4CAF50; display: inline-block; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .info-item { background: #f8f9fa; padding: 12px; border-radius: 8px; }
    .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .info-value { font-size: 16px; font-weight: bold; color: #333; }
    .stats-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin: 15px 0; }
    .stats-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); }
    .stats-row:last-child { border-bottom: none; }
    .stats-label { font-size: 14px; opacity: 0.9; }
    .stats-value { font-size: 18px; font-weight: bold; }
    .appliance-item { background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 10px 0; border-left: 4px solid #FF9800; }
    .appliance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .appliance-rank { background: #FF9800; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .appliance-name { font-size: 16px; font-weight: bold; color: #333; flex: 1; margin-left: 15px; }
    .appliance-cost { font-size: 18px; font-weight: bold; color: #4CAF50; }
    .appliance-details { font-size: 13px; color: #666; margin-top: 5px; }
    .recommendation { background: #E3F2FD; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #2196F3; }
    .recommendation-number { background: #2196F3; color: white; width: 25px; height: 25px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 10px; }
    .recommendation-text { display: inline; font-size: 14px; color: #333; line-height: 1.6; }
    .tariff-table { width: 100%; margin-top: 15px; border-collapse: collapse; }
    .tariff-table th, .tariff-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .tariff-table th { background: #f8f9fa; font-weight: bold; color: #333; }
    .tariff-table tr:last-child td { border-bottom: none; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    .footer strong { color: #4CAF50; }
    .warning-badge { background: #FFF3CD; color: #856404; padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FFC107; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ TANGEDCO POWER ANALYSIS REPORT</h1>
      <p>Smart Energy Management System • Powered by Gemini Vision AI</p>
      <span class="badge">${isActual ? '✅ ACTUAL DATA' : '⚠️ ESTIMATED'}</span>
    </div>

    <div class="section">
      <div class="section-title">📋 Customer Details</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Name</div>
          <div class="info-value">${userProfile.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Consumer ID</div>
          <div class="info-value">${userProfile.customerId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Meter Serial</div>
          <div class="info-value">${userProfile.meterSerial}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Mobile</div>
          <div class="info-value">${userProfile.mobile}</div>
        </div>
      </div>
      <div class="info-item" style="margin-top: 15px;">
        <div class="info-label">Address</div>
        <div class="info-value">${userProfile.address}</div>
      </div>
    </div>

    ${!isActual ? '<div class="warning-badge">⚠️ This report uses estimated values based on your appliances. Add a second meter reading for actual consumption data.</div>' : ''}

    <div class="section">
      <div class="section-title">📊 Consumption Summary</div>
      <div class="stats-card">
        <div class="stats-row">
          <span class="stats-label">⚡ Total Connected Load</span>
          <span class="stats-value">${recommendations.total_load_watts}W</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">📈 Consumption</span>
          <span class="stats-value">${recommendations.consumption_kwh} kWh</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">📅 Billing Period</span>
          <span class="stats-value">${recommendations.billing_days} days</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">📊 Readings Used</span>
          <span class="stats-value">${recommendations.readings_count} reading${recommendations.readings_count > 1 ? 's' : ''}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">💰 Current Bill</span>
          <span class="stats-value">₹${recommendations.estimated_cost}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">💵 Estimated Monthly Bill</span>
          <span class="stats-value">₹${ai.estimated_monthly_bill}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">🎯 Potential Monthly Savings</span>
          <span class="stats-value">₹${ai.savings_potential}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🏆 Top Power Consumers (Monthly Estimates)</div>
      ${recommendations.top_consumers.map((app, i) => `
        <div class="appliance-item">
          <div class="appliance-header">
            <div class="appliance-rank">${i + 1}</div>
            <div class="appliance-name">${app.name} (${app.quantity}×)</div>
            <div class="appliance-cost">₹${app.monthlyCost}/mo</div>
          </div>
          <div class="appliance-details">
            ${app.watts}W × ${app.hoursPerDay}hrs/day = ${app.dailyKwh.toFixed(2)} kWh/day • ${app.monthlyKwh.toFixed(2)} kWh/month
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <div class="section-title">💡 AI-Powered Recommendations</div>
      ${ai.recommendations.map((rec, i) => `
        <div class="recommendation">
          <span class="recommendation-number">${i + 1}</span>
          <span class="recommendation-text">${rec}</span>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <div class="section-title">📊 TANGEDCO Tariff Structure (Domestic LT-I)</div>
      <table class="tariff-table">
        <thead>
          <tr>
            <th>Consumption Slab</th>
            <th>Rate per Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0-100 units</td>
            <td><strong style="color: #4CAF50;">FREE</strong></td>
          </tr>
          <tr>
            <td>101-200 units</td>
            <td>₹2.50/unit</td>
          </tr>
          <tr>
            <td>201-500 units</td>
            <td>₹3.00/unit</td>
          </tr>
          <tr>
            <td>Above 500 units</td>
            <td>₹5.00/unit</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p><strong>Report Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
      <p style="margin-top: 10px;">🤖 Generated by <strong>INSTINCT 4.0</strong></p>
      <p>Smart Energy Management System for TANGEDCO Customers</p>
    </div>
  </div>
</body>
</html>`;
    
    try {
      const fileName = `TANGEDCO_Report_${userProfile.customerId}_${Date.now()}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, htmlContent);
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Download Power Analysis Report',
        UTI: 'public.html'
      });
      
      Alert.alert('✅ Success', 'Professional HTML report ready! Open in browser to view beautifully formatted report.');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('❌ Error', 'Could not generate report');
    }
  };

  const ManualEntryModal = () => {
    const [meterSerial, setMeterSerial] = useState(userProfile?.meterSerial || '');
    const [kWh, setKWh] = useState('');
    const [kVAh, setKVAh] = useState('');

    return (
      <Modal visible={showManualEntryModal} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>✍️ Manual Meter Entry</Text>
          <Text style={styles.modalSubtitle}>Enter readings from your meter</Text>
          
          <Text style={styles.label}>Meter Serial Number</Text>
          <TextInput 
            style={styles.input} 
            value={meterSerial} 
            onChangeText={setMeterSerial} 
            placeholder="Meter Serial"
          />
          
          <Text style={styles.label}>kWh Reading * (Required)</Text>
          <TextInput 
            style={styles.input} 
            value={kWh} 
            onChangeText={setKWh} 
            placeholder="e.g., 12050.00" 
            keyboardType="decimal-pad"
          />
          
          <Text style={styles.label}>kVAh Reading (Optional)</Text>
          <TextInput 
            style={styles.input} 
            value={kVAh} 
            onChangeText={setKVAh} 
            placeholder="e.g., 12500.00" 
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Billing Cycle Days</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            {[15, 30, 60].map(days => (
              <TouchableOpacity
                key={days}
                style={[styles.daysButton, billingDays === days && styles.daysButtonActive]}
                onPress={() => setBillingDays(days)}
              >
                <Text style={[styles.daysButtonText, billingDays === days && styles.daysButtonTextActive]}>
                  {days} days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={() => {
              if (!kWh) {
                Alert.alert('⚠️ Required', 'Please enter kWh reading');
                return;
              }
              addManualReading({
                serial: meterSerial || 'MANUAL',
                kWh: parseFloat(kWh),
                kVAh: kVAh ? parseFloat(kVAh) : null,
              });
            }}
          >
            <Text style={styles.saveButtonText}>💾 SAVE READING</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => setShowManualEntryModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    );
  };

  const ProfileForm = () => {
    const [isEditing, setIsEditing] = useState(!userProfile);
    const [name, setName] = useState(userProfile?.name || '');
    const [customerId, setCustomerId] = useState(userProfile?.customerId || '');
    const [meterSerial, setMeterSerial] = useState(userProfile?.meterSerial || '');
    const [mobile, setMobile] = useState(userProfile?.mobile || '');
    const [address, setAddress] = useState(userProfile?.address || '');

    useEffect(() => {
      if (userProfile) {
        setName(userProfile.name || '');
        setCustomerId(userProfile.customerId || '');
        setMeterSerial(userProfile.meterSerial || '');
        setMobile(userProfile.mobile || '');
        setAddress(userProfile.address || '');
        setIsEditing(false);
      }
    }, [userProfile]);

    if (!isEditing && userProfile) {
      return (
        <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 150 }}>
          <Text style={styles.formTitle}>⚡ INSTINCT 4.0</Text>
          <Text style={styles.formSubtitle}>Customer Profile</Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>📋 Meter Serial</Text>
              <Text style={styles.profileValue}>{userProfile.meterSerial}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>👤 Name</Text>
              <Text style={styles.profileValue}>{userProfile.name}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>🔢 Consumer ID</Text>
              <Text style={styles.profileValue}>{userProfile.customerId}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>📱 Mobile</Text>
              <Text style={styles.profileValue}>{userProfile.mobile}</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>📍 Address</Text>
              <Text style={styles.profileValue}>{userProfile.address}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.editButtonText}>✏️ EDIT PROFILE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testApiButton, 
              apiStatus === 'connected' && { backgroundColor: '#4CAF50' },
              apiStatus === 'failed' && { backgroundColor: '#f44336' }
            ]} 
            onPress={async () => {
              setApiStatus('testing');
              await testAPIConnection();
            }}
          >
            <Text style={styles.testApiButtonText}>
              {apiStatus === 'testing' && '⏳ Testing API...'}
              {apiStatus === 'connected' && '✅ API Connected - Test Again'}
              {apiStatus === 'failed' && '❌ API Failed - Retry Test'}
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: 50 }} />
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>⚡ INSTINCT 4.0</Text>
        <Text style={styles.formSubtitle}>{userProfile ? 'Edit Profile' : 'Create Profile'}</Text>
        
        <Text style={styles.label}>Meter Serial Number *</Text>
        <TextInput style={styles.input} value={meterSerial} onChangeText={setMeterSerial} placeholder="e.g., 1067244" />
        
        <Text style={styles.label}>Customer Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full Name" />
        
        <Text style={styles.label}>TANGEDCO Consumer ID *</Text>
        <TextInput style={styles.input} value={customerId} onChangeText={setCustomerId} placeholder="e.g., 092610302092" />
        
        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput style={styles.input} value={mobile} onChangeText={setMobile} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
        
        <Text style={styles.label}>Address *</Text>
        <TextInput style={[styles.input, { height: 80 }]} value={address} onChangeText={setAddress} placeholder="Full Address" multiline />
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => {
            if (!name || !customerId || !mobile || !meterSerial) {
              Alert.alert('⚠️ Missing Fields', 'Please fill all required fields');
              return;
            }
            if (mobile.length !== 10) {
              Alert.alert('⚠️ Invalid Mobile', 'Enter 10-digit mobile number');
              return;
            }
            saveProfile({ name, customerId, meterSerial, mobile, address, location: 'Chennai' });
            setIsEditing(false);
          }}
        >
          <Text style={styles.saveButtonText}>💾 SAVE PROFILE</Text>
        </TouchableOpacity>

        {userProfile && (
          <TouchableOpacity
            style={styles.cancelEditButton}
            onPress={() => {
              setName(userProfile.name);
              setCustomerId(userProfile.customerId);
              setMeterSerial(userProfile.meterSerial);
              setMobile(userProfile.mobile);
              setAddress(userProfile.address);
              setIsEditing(false);
            }}
          >
            <Text style={styles.cancelEditButtonText}>❌ CANCEL</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  const ApplianceList = () => {
    const totalLoad = appliances.reduce((sum, app) => sum + (app.watts * app.quantity), 0);
    
    return (
      <ScrollView style={styles.applianceContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚡ Your Appliances</Text>
          <Text style={styles.headerSubtitle}>Total Load: {totalLoad}W</Text>
        </View>
        
        {appliances.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>No appliances added yet</Text>
            <Text style={styles.emptyHint}>Use AI camera to detect automatically!</Text>
          </View>
        )}

        {appliances.map((app) => (
          <View key={app.id} style={styles.applianceCard}>
            <Text style={styles.applianceIcon}>{app.icon}</Text>
            <View style={styles.applianceInfo}>
              <Text style={styles.applianceName}>{app.name}</Text>
              <Text style={styles.applianceDetails}>
                {app.watts}W × {app.quantity} • {app.hoursPerDay}hrs/day
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert('Delete Appliance', `Remove ${app.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                      const updated = appliances.filter(a => a.id !== app.id);
                      setAppliances(updated);
                      await AsyncStorage.setItem('appliances', JSON.stringify(updated));
                    }
                  }
                ]);
              }}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity style={styles.aiButton} onPress={() => { setCameraMode('appliance'); setActiveView('camera'); }}>
          <Text style={styles.aiButtonText}>🤖 AI Detect Appliances</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowApplianceModal(true)}>
          <Text style={styles.addButtonText}>+ Add Manually</Text>
        </TouchableOpacity>
        
        {appliances.length > 0 && (
          <TouchableOpacity style={styles.nextButton} onPress={() => { setCameraMode('meter'); setActiveView('meter'); }}>
            <Text style={styles.nextButtonText}>Next: Take Meter Photos →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const ApplianceModal = () => {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [quantity, setQuantity] = useState('1');
    const [watts, setWatts] = useState('');
    const [hoursPerDay, setHoursPerDay] = useState('8');

    return (
      <Modal visible={showApplianceModal} animationType="slide" transparent={false}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Appliance</Text>
          
          <View style={styles.categoryGrid}>
            {MANUAL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, selectedCategory?.id === cat.id && styles.categoryCardSelected]}
                onPress={() => { 
                  setSelectedCategory(cat); 
                  setWatts(cat.avgWatts.toString()); 
                  setHoursPerDay(cat.hours.toString());
                }}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {selectedCategory && (
            <>
              <Text style={styles.label}>Power Rating (Watts)</Text>
              <TextInput style={styles.input} value={watts} onChangeText={setWatts} placeholder="Watts" keyboardType="numeric" />
              
              <Text style={styles.label}>Quantity</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Quantity" keyboardType="numeric" />
              
              <Text style={styles.label}>Hours per Day</Text>
              <TextInput style={styles.input} value={hoursPerDay} onChangeText={setHoursPerDay} placeholder="Hours/day" keyboardType="numeric" />
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={() => {
                  if (!watts || !quantity || !hoursPerDay) {
                    Alert.alert('⚠️ Missing Fields', 'Fill all fields');
                    return;
                  }
                  addAppliance({
                    category: selectedCategory.id,
                    name: selectedCategory.name,
                    icon: selectedCategory.icon,
                    watts: parseInt(watts),
                    quantity: parseInt(quantity),
                    hoursPerDay: parseFloat(hoursPerDay),
                  });
                }}
              >
                <Text style={styles.saveButtonText}>✅ Add Appliance</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowApplianceModal(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    );
  };

  const CameraView = () => {
    const [cameraReady, setCameraReady] = useState(false);
    
    if (hasPermission === null) {
      return (
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingScreenText}>Loading camera...</Text>
        </View>
      );
    }
    
    if (hasPermission === false) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorText}>Please enable camera access in Settings</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={[styles.guideBar, cameraMode === 'appliance' && { backgroundColor: '#FF9800' }]}>
          <Text style={styles.guideText}>
            {cameraMode === 'appliance' 
              ? '🤖 Point camera at room - AI will detect appliances' 
              : `📸 Take meter photos (${meterReadings.length} captured)`}
          </Text>
          <View style={[
            styles.apiStatusBadge, 
            apiStatus === 'connected' && { backgroundColor: '#4CAF50' },
            apiStatus === 'failed' && { backgroundColor: '#f44336' },
            apiStatus === 'testing' && { backgroundColor: '#FF9800' }
          ]}>
            <Text style={styles.apiStatusText}>
              {apiStatus === 'connected' && '✅ API OK'}
              {apiStatus === 'failed' && '❌ API Failed'}
              {apiStatus === 'testing' && '⏳ Testing...'}
            </Text>
          </View>
        </View>
        
        {/* CAMERA - 40% of screen */}
        <View style={{ height: '40%', width: '100%', backgroundColor: '#000' }}>
          <Camera 
            style={{ flex: 1 }}
            type={Camera.Constants.Type.back}
            onCameraReady={() => {
              if (!cameraReady) {
                setCameraReady(true);
                console.log('Camera ready!');
              }
            }}
            ref={cameraRef}
          >
            <View style={{ flex: 1, backgroundColor: 'transparent' }} />
          </Camera>
        </View>
        
        {/* READINGS HISTORY - Show latest 3 */}
        {meterReadings.length > 0 && cameraMode === 'meter' && (
          <ScrollView style={{ maxHeight: 150, backgroundColor: '#f5f5f5', padding: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📋 Recent Readings:</Text>
            {meterReadings.slice(-3).reverse().map((r, i) => (
              <View key={i} style={{ backgroundColor: '#fff', padding: 8, marginBottom: 6, borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600' }}>
                  {r.source === 'camera' ? '📸' : '✍️'} {r.serial} • {r.kWh} kWh
                </Text>
                <Text style={{ fontSize: 10, color: '#666' }}>
                  {new Date(r.timestamp).toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
        
        {/* CONTROLS - remaining space */}
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'space-around' }}>
          {cameraMode === 'appliance' ? (
            <>
              {detectingAppliances ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <ActivityIndicator size="large" color="#FF9800" />
                  <Text style={{ marginTop: 15, fontSize: 16, fontWeight: '600', color: '#333' }}>
                    AI Detecting Appliances...
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.hugeCaptureButton, { backgroundColor: '#FF9800' }]} 
                    onPress={detectAppliances}
                    disabled={!cameraReady}
                  >
                    <Text style={styles.hugeCaptureButtonText}>
                      {cameraReady ? '🤖 DETECT NOW' : '⏳ Loading...'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.secondaryButton]}
                    onPress={() => setActiveView('appliances')}
                  >
                    <Text style={styles.secondaryButtonText}>← Back</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.statusTextBig}>
                {meterReadings.length} readings • {cameraReady ? '✅ Ready' : '⏳ Loading...'}
              </Text>
              
              <TouchableOpacity 
                style={[styles.hugeCaptureButton, { backgroundColor: '#9C27B0' }]} 
                onPress={() => setShowManualEntryModal(true)}
              >
                <Text style={styles.hugeCaptureButtonText}>
                  ✍️ ENTER READING
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, { backgroundColor: '#2196F3' }]}
                onPress={takeMeterPhoto} 
                disabled={processing || !cameraReady}
              >
                <Text style={styles.secondaryButtonText}>
                  {processing ? '⏳ Processing...' : '📸 Try Camera (May Timeout)'}
                </Text>
              </TouchableOpacity>
              
              {meterReadings.length >= 1 && (
                <TouchableOpacity 
                  style={[styles.secondaryButton, { backgroundColor: '#4CAF50' }]}
                  onPress={generateAnalysis} 
                  disabled={processing}
                >
                  <Text style={styles.secondaryButtonText}>
                    {processing ? '⏳ Analyzing...' : meterReadings.length >= 2 ? '🧠 ANALYZE' : '📊 VIEW REPORT'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const AnalysisView = () => {
    if (!recommendations) return null;
    
    const ai = recommendations.ai_recommendations;
    const isEstimated = recommendations.estimation_type === 'estimated';
    
    return (
      <ScrollView style={styles.analysisContainer}>
        <Text style={styles.analysisTitle}>📊 Power Analysis</Text>
        
        {isEstimated && (
          <View style={{ backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 15 }}>
            <Text style={{ fontSize: 13, color: '#856404' }}>
              ⚠️ Estimated values based on appliances. Add 2nd reading for actual consumption.
            </Text>
          </View>
        )}
        
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📅 Period:</Text>
            <Text style={styles.statValue}>{recommendations.billing_days} days {isEstimated ? '(Est)' : '(Actual)'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📊 Readings:</Text>
            <Text style={styles.statValue}>{recommendations.readings_count} {isEstimated ? '(Need 2+)' : '✅'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>⚡ Total Load:</Text>
            <Text style={styles.statValue}>{recommendations.total_load_watts}W</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📈 Consumption:</Text>
            <Text style={styles.statValue}>{recommendations.consumption_kwh} kWh</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>💰 Period Cost:</Text>
            <Text style={styles.statValue}>₹{recommendations.estimated_cost}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📊 Monthly Est.:</Text>
            <Text style={styles.statValue}>₹{ai.estimated_monthly_bill}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>💵 Monthly Savings:</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>₹{ai.savings_potential}</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>🏆 Top Power Consumers (Monthly)</Text>
        {recommendations.top_consumers.slice(0, 5).map((app, i) => (
          <View key={i} style={styles.consumerCard}>
            <Text style={styles.consumerRank}>{i + 1}</Text>
            <View style={styles.consumerInfo}>
              <Text style={styles.consumerName}>{app.name} ({app.quantity}×)</Text>
              <Text style={styles.consumerUsage}>
                {app.watts}W • {app.hoursPerDay}hrs/day • {app.monthlyKwh.toFixed(1)} kWh/month
              </Text>
            </View>
            <Text style={styles.consumerCost}>₹{app.monthlyCost}</Text>
          </View>
        ))}
        
        <Text style={styles.sectionTitle}>💡 AI Recommendations</Text>
        {ai.recommendations.map((rec, i) => (
          <View key={i} style={styles.recommendationCard}>
            <Text style={styles.recommendationNumber}>{i + 1}</Text>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
        
        <TouchableOpacity style={styles.downloadButton} onPress={downloadPDFReport}>
          <Text style={styles.downloadButtonText}>📥 DOWNLOAD HTML REPORT</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const BottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={[styles.navButton, activeView === 'profile' && styles.navButtonActive]} 
        onPress={() => setActiveView('profile')}
      >
        <Text style={styles.navIcon}>👤</Text>
        <Text style={styles.navLabel}>Profile</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, (activeView === 'appliances' || activeView === 'camera') && styles.navButtonActive]} 
        onPress={() => {
          if (userProfile) {
            setActiveView('appliances');
          } else {
            Alert.alert('⚠️ First', 'Create profile first');
          }
        }}
      >
        <Text style={styles.navIcon}>⚡</Text>
        <Text style={styles.navLabel}>Devices</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, activeView === 'meter' && styles.navButtonActive]} 
        onPress={() => {
          if (!userProfile) {
            Alert.alert('⚠️ First', 'Create profile first');
            return;
          }
          if (appliances.length === 0) {
            Alert.alert('⚠️ First', 'Add appliances first');
            return;
          }
          setCameraMode('meter');
          setActiveView('meter');
        }}
      >
        <Text style={styles.navIcon}>📸</Text>
        <Text style={styles.navLabel}>Meter</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, activeView === 'analysis' && styles.navButtonActive]} 
        onPress={() => {
          if (meterReadings.length >= 1 && appliances.length > 0) {
            // Auto-generate if not already done
            if (!recommendations) {
              generateAnalysis();
            } else {
              setActiveView('analysis');
            }
          } else {
            Alert.alert('⚠️ Not Ready', 
              meterReadings.length === 0 
                ? 'Take at least 1 meter reading first'
                : 'Add appliances first'
            );
          }
        }}
      >
        <Text style={styles.navIcon}>📊</Text>
        <Text style={styles.navLabel}>Report</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      {activeView === 'profile' && <ProfileForm />}
      {activeView === 'appliances' && <ApplianceList />}
      {(activeView === 'meter' || activeView === 'camera') && <CameraView />}
      {activeView === 'analysis' && <AnalysisView />}
      <ApplianceModal />
      <ManualEntryModal />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  
  // HUGE CAPTURE BUTTON - FULLY VISIBLE!
  hugeCaptureButton: {
    backgroundColor: '#2196F3',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    marginVertical: 10,
  },
  hugeCaptureButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: '#666',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 5,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusTextBig: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  
  daysButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  daysButtonActive: {
    backgroundColor: '#4CAF50',
  },
  daysButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  daysButtonTextActive: {
    color: '#fff',
  },
  
  // Loading & Error
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingScreenText: { marginTop: 15, fontSize: 16, color: '#666' },
  errorScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  errorIcon: { fontSize: 64, marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center' },
  
  // Profile
  formContainer: { flex: 1, padding: 20, paddingTop: 50 },
  formTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, color: '#4CAF50' },
  formSubtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileRow: { paddingVertical: 12 },
  profileLabel: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '600' },
  profileValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  profileDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
  editButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 10, marginTop: 10, elevation: 3 },
  editButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  testApiButton: { backgroundColor: '#2196F3', padding: 16, borderRadius: 10, marginTop: 10, elevation: 3 },
  testApiButtonText: { color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
  cancelEditButton: { backgroundColor: '#f44336', padding: 16, borderRadius: 10, marginTop: 10, elevation: 2 },
  cancelEditButtonText: { color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  
  // Form
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, marginTop: 12, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 10, fontSize: 16, marginBottom: 8, backgroundColor: '#f9f9f9' },
  saveButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, marginTop: 25, elevation: 3 },
  saveButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  
  // Appliances
  applianceContainer: { flex: 1, padding: 20 },
  header: { marginBottom: 20, paddingTop: 35 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 5 },
  emptyHint: { fontSize: 14, color: '#666' },
  applianceCard: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 2 },
  applianceIcon: { fontSize: 36, marginRight: 15 },
  applianceInfo: { flex: 1 },
  applianceName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  applianceDetails: { fontSize: 13, color: '#666', marginTop: 3 },
  deleteButton: { padding: 8 },
  deleteButtonText: { fontSize: 20 },
  aiButton: { backgroundColor: '#FF9800', padding: 16, borderRadius: 10, marginTop: 15, elevation: 3 },
  aiButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  addButton: { backgroundColor: '#2196F3', padding: 16, borderRadius: 10, marginTop: 10, elevation: 3 },
  addButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  nextButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, marginTop: 15, marginBottom: 100, elevation: 3 },
  nextButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  
  // Modal
  modalContainer: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  categoryCard: { width: '48%', backgroundColor: '#f5f5f5', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#f5f5f5' },
  categoryCardSelected: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  categoryIcon: { fontSize: 36, marginBottom: 8 },
  categoryName: { fontSize: 13, textAlign: 'center', fontWeight: '600', color: '#333' },
  cancelButton: { backgroundColor: '#ddd', padding: 16, borderRadius: 10, marginTop: 15, marginBottom: 50 },
  cancelButtonText: { color: '#333', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  
  // Camera
  guideBar: { backgroundColor: '#4CAF50', padding: 18, paddingTop: 50 },
  guideText: { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '600' },
  apiStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
  },
  apiStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Analysis
  analysisContainer: { flex: 1, padding: 20, paddingTop: 50 },
  analysisTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  statsCard: { backgroundColor: '#f5f5f5', padding: 18, borderRadius: 12, marginBottom: 25, elevation: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  statLabel: { fontSize: 15, color: '#666', fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', marginTop: 20, marginBottom: 12, color: '#333' },
  consumerCard: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center', elevation: 2 },
  consumerRank: { fontSize: 24, fontWeight: 'bold', color: '#FF9800', marginRight: 15, width: 30 },
  consumerInfo: { flex: 1 },
  consumerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  consumerUsage: { fontSize: 13, color: '#666', marginTop: 2 },
  consumerCost: { fontSize: 15, fontWeight: 'bold', color: '#4CAF50' },
  recommendationCard: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 12, flexDirection: 'row', elevation: 1 },
  recommendationNumber: { fontSize: 18, fontWeight: 'bold', color: '#2196F3', marginRight: 12 },
  recommendationText: { fontSize: 14, lineHeight: 20, color: '#333', flex: 1 },
  downloadButton: { backgroundColor: '#E91E63', padding: 18, borderRadius: 10, marginTop: 25, marginBottom: 100, elevation: 4 },
  downloadButtonText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  
  // Bottom Nav
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 10, paddingTop: 8, elevation: 10 },
  navButton: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  navButtonActive: { borderTopWidth: 3, borderTopColor: '#4CAF50' },
  navIcon: { fontSize: 24, marginBottom: 4 },
  navLabel: { fontSize: 10, color: '#666', fontWeight: '600' },
});