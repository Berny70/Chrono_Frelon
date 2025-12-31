import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [count, setCount] = useState(0);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Autorisation caméra requise</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={styles.button}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 1,
      skipProcessing: true, // CRITIQUE sur Android
      exif: false
    });

    console.log(photo.uri);
    setCount(c => c + 1);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        zoom={0}
        enableTorch={false}
        autofocus="on"
      />

      {/* Cadre de scan */}
      <View style={styles.scanFrame} />

      {/* UI */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={takePicture} style={styles.capture}>
          <Text style={styles.captureText}>CAPTURE</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>Images : {count}</Text>
      </View>
    </View>
  );
}
