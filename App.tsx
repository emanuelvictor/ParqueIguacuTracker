import React, { useState } from 'react';
import { Alert, Button, PermissionsAndroid, Platform, SafeAreaView, Text, View, } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import BackgroundService from 'react-native-background-actions';
import { LocationData } from './src/types/location.ts';
import firestore from '@react-native-firebase/firestore';


export default function App() {
  const [location, setLocation] = useState<LocationData | null>();
  const [error, setError] = useState<string | null>(null);

  async function requestPermission() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  const trackingTask = async (taskDataArguments: any): Promise<any> => {
    const { delay } = taskDataArguments;

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      setError('Permissão negada');
      return;
    }

    await new Promise(async () => {
      setInterval(async () => {
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude, speed } = position.coords;

            // Calcular velocidade em km/h
            const speedKmh = speed ? parseFloat((speed * 3.6).toFixed(2)) : 0;

            const locationData: LocationData = {
              latitude,
              longitude,
            };

            locationData.speed = speedKmh;
            locationData.timestamp = position.timestamp;
            setLocation(locationData);

            try {
              // // Salvar no Firestore (vai para cache se offline)
              await firestore().collection('locations').add(locationData);

              console.log('Localização salva:', locationData);

              // Verificar velocidade
              if (speedKmh > 40) {
                console.warn(`⚠️ VELOCIDADE ACIMA DO LIMITE: ${speedKmh} km/h`);
              }
            } catch (error) {
              console.error('Erro ao salvar localização:', error);
            }
          },
          error => {
            console.error('Erro ao obter localização:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 1000,
          },
        );
      }, delay);
    });
  };

  const startTracking = async (): Promise<any> => {
    const options = {
      taskName: 'Rastreamento GPS',
      taskTitle: 'Monitorando sua localização',
      taskDesc: 'Parque Nacional do Iguaçu',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff00ff',
      linkingURI: 'br.org.itaipuparquetec.tracker://tracking',
      progressBar: {
        max: 100,
        value: 0,
        indeterminate: true,
      },
      parameters: {
        delay: 5000, // Verificar a cada 5 segundos
      },
    };

    try {
      await BackgroundService.start(trackingTask, options);
      Alert.alert('Rastreamento iniciado', 'GPS ativo em background');
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o rastreamento');
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <Button title="Start tracking" onPress={startTracking} />

      <View style={{ marginTop: 20 }}>
        {location && (
          <Text>
            Latitude: {location.latitude}
            {'\n'}
            Longitude: {location.longitude}
          </Text>
        )}

        {error && <Text style={{ color: 'red' }}>Erro: {error}</Text>}
      </View>
    </SafeAreaView>
  );
}