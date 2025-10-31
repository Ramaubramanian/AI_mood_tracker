import React, { useState, useEffect } from "react";
// Removed: import QRCode from 'qrcode.react'; // Dependency is not resolvable

// Converted back to use web standard components (div, button, textarea, etc.) 
// and Tailwind CSS classes for web compatibility.

const API_KEY = "AIzaSyCSKrFbptBb51rmr--eJ5VHzIbnQTfDezk"; // Managed by the environment
const MODEL = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// Component for a simple loading spinner
const LoadingSpinner = () => (
  <div className="flex flex-col items-center mt-6 p-4">
    <svg className="animate-spin h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-2 text-sm text-blue-400">Analyzing your mood...</p>
  </div>
);

/**
 * Simple placeholder for the QR Code functionality using the Google Charts API,
 * which generates an image URL that can be rendered using a standard <img> tag.
 * NOTE: This is a robust fallback for environments that do not support NPM dependencies.
 */
const QRCodePlaceholder = ({ value, size }) => {
  const chartUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(value)}`;
  
  return (
    <img 
      src={chartUrl} 
      alt="QR Code to open app on mobile" 
      width={size} 
      height={size} 
      className="rounded-lg shadow-md border-2 border-red-500"
      // Added a fallback for better UX in case the image fails to load
      onError={(e) => { e.target.onerror = null; e.target.alt = "QR Code loading failed. URL: " + value; e.target.style.display = 'none'; }}
    />
  );
};


export default function App() {
  const [mood, setMood] = useState("");
  const [reflection, setReflection] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appUrl, setAppUrl] = useState(''); // State to hold the app's URL

  useEffect(() => {
    // Set the current URL as the app URL for the QR code
    setAppUrl(window.location.href);
  }, []);

  const getReflection = async () => {
    if (!mood.trim()) {
      setReflection("Please enter how you are feeling first!");
      return;
    }

    setIsLoading(true);
    setReflection("");

    // System instruction to guide the model's persona
    const systemPrompt = "You are a kind and empathetic mood journal assistant who helps users reflect on their emotions positively. Analyze the emotion and respond with its mood intensity (Positive, Negative, or Neutral) and give a thoughtful, short reflection in a single paragraph.";

    // User Query
    const userQuery = `I am feeling ${mood}. Please classify the mood intensity and give a short, empathetic reflection.`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
    };

    let response;
    let delay = 1000;
    const maxRetries = 3;

    try {
      for (let i = 0; i < maxRetries; i++) {
        response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          break; // Success, exit the loop
        }

        if (i < maxRetries - 1) {
          // Implementing required exponential backoff for retry
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; 
        } else {
          // Last retry failed, throw an error
          const errorData = await response.json();
          throw new Error(`API failed after ${maxRetries} attempts: ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();

      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.[0]?.text) {
        const generatedText = data.candidates[0].content.parts[0].text;
        setReflection(generatedText);
      } else if (data.error) {
        setReflection(`Error: ${data.error.message || data.error.statusMessage}`);
      } else {
        setReflection("Sorry, I couldn’t generate a reflection. The model returned an unexpected response.");
      }
    } catch (error) {
      console.error("Gemini API Call Error:", error);
      setReflection(`Error: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-blue-500 to-green-500 p-4 md:p-8 flex justify-center items-center font-[Inter]">
      <div className="w-full max-w-lg bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 border-t-4 border-red-400 border-b-4 border-green-400">
        <h1 className="text-4xl font-extrabold text-center text-red-700 mb-6 drop-shadow-md font-serif italic">
          🧠 AI Mood Tracker
        </h1>

        {/* QR Code Section - Now using a self-contained component */}
        <div className="flex flex-col items-center mb-6 p-4 bg-blue-50 bg-opacity-70 rounded-xl shadow-inner border border-blue-200">
          <p className="text-lg font-semibold text-blue-700 mb-3">Scan to open on mobile!</p>
          {appUrl ? (
            <QRCodePlaceholder 
              value={appUrl} 
              size={180} 
            />
          ) : (
            <p className="text-sm text-gray-500">Loading QR code...</p>
          )}
          <p className="text-xs text-blue-500 mt-2">Opens this web app in your mobile browser.</p>
        </div>

        <textarea
          placeholder="How are you feeling today? Write a few sentences about your mood."
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          rows={6}
          className="w-full border border-blue-300 rounded-xl p-4 text-base bg-blue-50 shadow-inner focus:border-red-400 focus:ring-2 focus:ring-red-400 resize-none transition duration-150 ease-in-out text-green-800 placeholder-blue-400"
          style={{ fontFamily: 'monospace' }}
        />

        <button
          onClick={getReflection}
          disabled={isLoading || !mood.trim()}
          className={`w-full py-3 mt-4 text-white font-bold rounded-xl transition duration-300 ease-in-out shadow-lg transform hover:scale-105 active:scale-95 ${
            isLoading || !mood.trim()
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
          }`}
        >
          {isLoading ? "Reflecting..." : "Reflect with AI"}
        </button>

        {isLoading && <LoadingSpinner />}

        {reflection && !isLoading ? (
          <div
            className="mt-8 bg-white p-6 rounded-xl shadow-2xl border-l-4 border-red-500 border-r-4 border-blue-500"
          >
            <h2 className="text-xl font-bold mb-3 text-green-700">
              AI Reflection
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{reflection}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
