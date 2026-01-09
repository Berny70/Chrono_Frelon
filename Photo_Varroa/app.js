import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import ImagePicker from 'react-native-image-crop-picker';

export default function App() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [count, setCount] = useState(0);

  if (!permission) return <View />;
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
      skipProcessing: true,
      exif: false,
      base64: true,
    });
    console.log(photo.uri);
    setCount(c => c + 1);
    await savePhoto(photo.uri);
    await cropImage(photo.uri);
  };

  const savePhoto = async (uri) => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `Lange_Ruche1_${date}_${count + 1}.jpg`;
    const localUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: localUri });
    console.log("Photo sauvegardée :", localUri);
  };

  const cropImage = (uri) => {
    ImagePicker.openCropper({
      path: uri,
      width: 300,
      height: 300,
      cropping: true,
    }).then(croppedImage => {
      console.log("Image recadrée :", croppedImage.path);
    });
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
        focusDepth={0.1}
        whiteBalance="auto"
        ratio="4:3"
      />
      <View style={styles.scanFrame}>
        <View style={styles.scanGrid}>
          {[...Array(9)].map((_, i) => <View key={i} style={styles.gridLine} />)}
        </View>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={takePicture} style={styles.capture}>
          <Text style={styles.captureText}>CAPTURE</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>Images : {count}</Text>
      </View>
    </View>
  );
}

// Styles inchangés (ajoutez scanGrid et gridLine)
