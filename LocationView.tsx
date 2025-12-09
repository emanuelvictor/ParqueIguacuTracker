import React from 'react';
import { Text } from 'react-native';
import { GeoPosition } from 'react-native-geolocation-service';

function LocationView(props: { location: GeoPosition }) {
  return (
    <>
      <Text>Latitude: {props.location?.coords?.latitude}</Text>
      <Text>Longitude: {props.location?.coords?.longitude}</Text>
    </>
  );
}

export default LocationView;
