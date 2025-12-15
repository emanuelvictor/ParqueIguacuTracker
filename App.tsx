import React, { useState } from 'react';
import {
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import BackgroundService from 'react-native-background-actions';
import { LocationData } from './src/types/location.ts';
import firestore from '@react-native-firebase/firestore';

let lastLocationSynced : LocationData = new LocationData();

export default function App() {
  const [currentLocation, setCurrentLocation] = useState<LocationData>();

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [intervalId, setIntervalId] = useState<number>(0);
  const [infractions, setInfractions] = useState<string[]>([]);

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
      setIntervalId(
        setInterval(async () => {
          Geolocation.getCurrentPosition(
            async position => {
              const { latitude, longitude, speed } = position.coords;

              if (lastLocationSynced?.longitude === 0) { // Armazena a última localização, como se fosse a primeira, quando for a primeira rodagem.
                lastLocationSynced = { latitude, longitude, distance: 0 };
              }

              const distance: number = calculateDistance(
                lastLocationSynced?.latitude,
                lastLocationSynced?.longitude,
                latitude,
                longitude
              );

              // Calcular velocidade em km/h
              const speedKmh = speed ? (speed * 3.6).toFixed(2) : 0;

              const locationToSave: LocationData = {
                latitude,
                longitude,
                distance,
                speed: parseFloat('' + speedKmh),
                timestamp: new Date().getDate(),
                synced: false
              };

                setCurrentLocation(locationToSave);
              try {
                if (locationToSave.distance >= 300) {
                  lastLocationSynced = (locationToSave);
                  // Salvar no Firestore (vai para cache se offline)
                  firestore().collection('locations').add(locationToSave).then();
                }


                // Verificar velocidade
                if (Number(speedKmh) > 40) {
                  const infractionsNewState = infractions;
                  infractionsNewState.push(
                    `⚠️ VELOCIDADE ACIMA DO LIMITE: ${speedKmh} km/h`,
                  );
                  setInfractions([...infractionsNewState]);
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
        }, delay),
      );

      return () => clearInterval(intervalId);
    });
  };

  const calculateDistance = (
    lat1?: number,
    lon1?: number,
    lat2?: number,
    lon2?: number,
  ) => {
    if(!lat1 || !lon1 || !lat2 || !lon2) {
      return 0;
    }
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distância em metros
  };

  const startOrStopTracking = async (): Promise<any> => {
    if (isTracking) {
      await BackgroundService.stop();
      setIsTracking(false);
      clearInterval(intervalId);
    } else {
      setInfractions([]);
      await startTracking();
      setIsTracking(true);
    }
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

  const getNameOfButton = () => {
    return isTracking ? 'Encerrar rastreamento' : 'Iniciar rastreamento';
  };

  return (
    <SafeAreaView
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <Button title={getNameOfButton()} onPress={startOrStopTracking} />

      <View style={{ marginTop: 20 }}>
        {currentLocation && (
          <Text>
            Latitude: {currentLocation.latitude}
            {'\n'}
            Longitude: {currentLocation.longitude}
            {'\n'}
            Distância: {currentLocation.distance?.toFixed(2)} metros
            {'\n'}
            Última Latitude: {lastLocationSynced?.latitude}
            {'\n'}
            Última Longitude: {lastLocationSynced?.longitude}
            {'\n'}
            Última Distância: {lastLocationSynced?.distance?.toFixed(2)} metros
          </Text>
        )}

        {error && <Text style={{ color: 'red' }}>Erro: {error}</Text>}
      </View>
      {/*{infractions.map((infraction, index) => (*/}
      {/*  <View key={index}>*/}
      {/*    <Text>Infração: {infraction}</Text>*/}
      {/*  </View>*/}
      {/*))}*/}
    </SafeAreaView>
  );
}
