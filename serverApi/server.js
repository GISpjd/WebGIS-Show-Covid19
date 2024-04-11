import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
const app = express()

//解决跨域问题
app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    next()
})

const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'covid',
    password: '123456',
    port: 5432,
})

app.use(express.json())

app.get('/get-maximum', async (req, res) => {
    try {
        const { parameter, date1, date2 } = req.query
        const query = {
            text: `SELECT MAX(sum) FROM (
                     SELECT SUM(daily_${parameter}) as sum
                     FROM world_covid_data
                     WHERE date >= $1 AND date <= $2
                     GROUP BY country_name
                   ) z`,
            values: [date1, date2],
        };
        const { rows } = await pool.query(query)
        res.json({ maximum: rows })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
})

// 整个world每日的......
app.get('/daily-by-world', async (req, res) => {
    try {
        const { parameter, date1, date2 } = req.query;

        // 使用参数化查询以避免SQL注入
        const queryText = `
        SELECT SUM(daily_${parameter}) AS total, date 
        FROM world_covid_data 
        WHERE date >= $1 AND date <= $2 
        GROUP BY date 
        ORDER BY date
      `;
        const queryParams = [date1, date2];

        // 执行查询
        const { rows } = await pool.query(queryText, queryParams);

        // 将结果格式化为JSON并发送响应
        res.json(rows);
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});

// 根据日期的累加(但显示的范围是由传入的参数决定)
app.get('/cumulative-by-world', async (req, res) => {
    try {
        const { parameter, date1, date2 } = req.query;

        const queryText = `
        SELECT SUM(total_${parameter}) AS "${parameter}", date
        FROM world_covid_data
        WHERE date >= $1 AND date <= $2
        GROUP BY date
        ORDER BY date
      `;
        const queryParams = [date1, date2];

        const { rows } = await pool.query(queryText, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});

// 获取规定日期范围对应城市每日的cases/deaths/vaccinations/texts
app.get('/daily-by-country', async (req, res) => {
    try {
        const { parameter, date1, date2, country } = req.query;
        const queryText = `
        SELECT daily_${parameter} AS "${parameter}", date
        FROM world_covid_data
        WHERE date >= $1 AND date <= $2 AND country_name = $3
        ORDER BY date
      `;
        const queryParams = [date1, date2, country];

        const { rows } = await pool.query(queryText, queryParams);

        // 发送JSON响应
        res.json(rows);
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});


// 获取规定日期范围对应城市每日的累计cases/deaths/vaccinations/texts
app.get('/cumulative-by-country', async (req, res) => {
    try {
        const { parameter, date1, date2, country } = req.query;
        const queryText = `
        SELECT total_${parameter} AS "${parameter}", date
        FROM world_covid_data
        WHERE date >= $1 AND date <= $2 AND country_name = $3
        ORDER BY date
      `;
        const queryParams = [date1, date2, country];

        const result = await pool.query(queryText, queryParams);

        // 发送JSON响应
        res.json(result.rows);
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});


// 查询特定时间段内，按国家分组的某个参数的总和，并与国家的几何形状结合
app.get('/geojson-data', async (req, res) => {
    try {
        const { parameter, date1, date2 } = req.query;
        const queryText = `
        SELECT selected.${parameter}, selected.country_name, ST_AsGeoJSON(ST_Simplify(countries.geom, 0.0007)) AS geometry
        FROM countries 
        LEFT JOIN (
          SELECT SUM(daily_${parameter}) AS ${parameter}, country_name 
          FROM world_covid_data 
          WHERE date >= $1 AND date <= $2 
          GROUP BY country_name
        ) AS selected ON selected.country_name = countries.country_name
      `;
        const queryParams = [date1, date2];

        const { rows } = await pool.query(queryText, queryParams);

        // 构造GeoJSON格式的响应
        const geoJson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    parameter: row[parameter],
                    country_name: row.country_name
                }
            }))
        };

        res.json(geoJson);
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});


// 查询在特定日期范围内，各个国家对于某个参数（比如确诊人数、死亡人数等）的累计值，并获取这些国家地理中心点的GeoJSON表示
app.get('/geojson-centroids', async (req, res) => {
    try {
        const { parameter, date1, date2 } = req.query;
        const queryText = `
        SELECT selected.${parameter}, selected.country_name, ST_AsGeoJSON(ST_Centroid(countries.geom)) AS geometry
        FROM countries 
        LEFT JOIN (
          SELECT SUM(daily_${parameter}) AS ${parameter}, country_name 
          FROM world_covid_data 
          WHERE date >= $1 AND date <= $2 
          GROUP BY country_name
        ) AS selected ON selected.country_name = countries.country_name
      `;
        const queryParams = [date1, date2];

        const result = await pool.query(queryText, queryParams);

        // 构造GeoJSON格式的响应
        const geoJson = {
            type: "FeatureCollection",
            features: result.rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    parameter: row[parameter],
                    country_name: row.country_name
                }
            }))
        };

        res.json(geoJson);
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});


// 查询在某个时间范围，全球对应某个参数的累计值
app.get('/covid-summary', async (req, res) => {
    try {
        const { date1, date2 } = req.query;
        const queryText = `
        SELECT SUM(daily_cases) as cases, SUM(daily_deaths) as deaths, 
               SUM(daily_vaccinations) as vaccinations, SUM(daily_tests) as tests 
        FROM world_covid_data 
        WHERE date >= $1 AND date <= $2
      `;
        const queryParams = [date1, date2];

        const result = await pool.query(queryText, queryParams);

        // 发送JSON格式的响应
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({});
        }
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});


app.get('/covid-country-summary', async (req, res) => {
    try {
        const { date1, date2, country } = req.query;

        // 使用参数化查询以增强安全性，避免SQL注入
        const queryText = `
        SELECT SUM(daily_cases) as cases, SUM(daily_deaths) as deaths, 
               SUM(daily_vaccinations) as vaccinations, SUM(daily_tests) as tests 
        FROM world_covid_data 
        WHERE date >= $1 AND date <= $2 AND country_name = $3
      `;
        const queryParams = [date1, date2, country];

        const result = await pool.query(queryText, queryParams);

        // 如果查询结果不为空，则发送第一行数据
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // 如果没有找到数据，则返回一个空对象
            res.json({});
        }
    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).send('Server error');
    }
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
