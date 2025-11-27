export interface IQAirWeather {
  ts: string;
  tp: number; // temperature
  pr: number; // pressure
  hu: number; // humidity
  ws: number; // wind speed
  wd: number; // wind direction
}

export interface IQAirPollution {
  ts: string;
  aqius: number; // AQI US
  mainus: string; // main pollutant US
  aqicn?: number; // AQI China
  maincn?: string; // main pollutant China
  p2?: {
    conc: number; // PM2.5 concentration
    aqius: number;
    aqicn: number;
  };
  p1?: {
    conc: number; // PM10 concentration
    aqius: number;
    aqicn: number;
  };
  o3?: {
    conc: number;
    aqius: number;
    aqicn: number;
  };
  n2?: {
    conc: number;
    aqius: number;
    aqicn: number;
  };
  s2?: {
    conc: number;
    aqius: number;
    aqicn: number;
  };
  co?: {
    conc: number;
    aqius: number;
    aqicn: number;
  };
}

export interface IQAirCurrentData {
  weather: IQAirWeather;
  pollution: IQAirPollution;
}

export interface IQAirLocation {
  type: string;
  coordinates: [number, number];
}

export interface IQAirCity {
  name: string;
}

export interface IQAirState {
  name: string;
}

export interface IQAirCountry {
  name: string;
}

export interface IQAirResponse {
  status: string;
  data: {
    city: string;
    state: string;
    country: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
    current: IQAirCurrentData;
  };
}
