package main

import (
	"fmt"
	"log"
	"net/http"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Images struct{
	gorm.Model
	Name string
}

func main() {
	router := gin.Default()
	router.Use(cors.Default())
	router.MaxMultipartMemory = 8 << 20 // 8 MiB

	dsn := "host=postgres user=user password=password dbname=images port=5432 sslmode=disable TimeZone=Asia/Tokyo"
	db, _ := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	db.AutoMigrate(&Images{})

	router.POST("/upload", func(c *gin.Context) {
		file, _ := c.FormFile("file")
		log.Println(file.Size)

		image := Images{Name: file.Filename}
		db.Create(&image)

		c.String(http.StatusOK, fmt.Sprintf("'%s' uploaded!", file.Size))
	})
	router.Run(":8080")
}
