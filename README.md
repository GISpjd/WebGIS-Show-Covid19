"# WebGIS-Show-Covid19" 
- 该项目是部署在Tomcat上的WebGIS应用，利用PostgreSQL数据库实现数据的存储和查询，并利用express框架实现前后端交互。 
- data文件夹装的是要导入postgresql数据库的数据，WB_countries_Admin0_10m装的是世界行政区划面，具体操作可看https://blog.csdn.net/weixin_73810008/article/details/137602380?spm=1001.2014.3001.5501

- jsp_files装的是jsp文件，它也是连接数据库并传入查询参数实现前后端交互的方式，但它已经是个老东西了，我们要拥抱新技术

- serverApi就是利用express框架创建服务器实现前后端交互
- web_source是与网页需要的相关静态资源

<u>### 效果</u>
![效果图](./效果图.gif)
