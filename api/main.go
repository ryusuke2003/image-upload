package main

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main(){
	api := "localhost:8080"
	r := gin.Default()

	r.Use(cors.Default())

	r.GET("/ping", func(c *gin.Context){
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})
	r.Run(api)
}