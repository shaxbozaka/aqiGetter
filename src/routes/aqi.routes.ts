import { FastifyPluginAsync } from 'fastify';
import dataService from '../services/data.service';

const aqiRoutes: FastifyPluginAsync = async (fastify) => {
  // Get latest AQI data
  fastify.get('/aqi/latest', {
    schema: {
      description: 'Get latest air quality readings',
      tags: ['AQI'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string', default: 'Tashkent' },
          limit: { type: 'number', default: 10 },
        },
      },
    },
  }, async (request, reply) => {
    const { city = 'Tashkent', limit = 10 } = request.query as { city?: string; limit?: number };

    try {
      const data = await dataService.getLatestData(city, limit);
      return reply.send({ success: true, data });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch data',
      });
    }
  });

  // Get AQI statistics
  fastify.get('/aqi/stats', {
    schema: {
      description: 'Get AQI statistics for a time period',
      tags: ['AQI'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string', default: 'Tashkent' },
          hours: { type: 'number', default: 24 },
        },
      },
    },
  }, async (request, reply) => {
    const { city = 'Tashkent', hours = 24 } = request.query as { city?: string; hours?: number };

    try {
      const stats = await dataService.getAverageAQI(city, hours);
      return reply.send({ success: true, data: stats });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  });

  // Get data by date range
  fastify.get('/aqi/range', {
    schema: {
      description: 'Get AQI data for a date range',
      tags: ['AQI'],
      querystring: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          city: { type: 'string', default: 'Tashkent' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const { city = 'Tashkent', startDate, endDate } = request.query as {
      city?: string;
      startDate: string;
      endDate: string;
    };

    try {
      const data = await dataService.getDataByDateRange(
        city,
        new Date(startDate),
        new Date(endDate)
      );
      return reply.send({ success: true, data });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch data',
      });
    }
  });

  // Get current AQI
  fastify.get('/aqi/current', {
    schema: {
      description: 'Get the most recent AQI reading',
      tags: ['AQI'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string', default: 'Tashkent' },
        },
      },
    },
  }, async (request, reply) => {
    const { city = 'Tashkent' } = request.query as { city?: string };

    try {
      const data = await dataService.getLatestData(city, 1);
      if (data.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'No data found',
        });
      }
      return reply.send({ success: true, data: data[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch data',
      });
    }
  });
};

export default aqiRoutes;
