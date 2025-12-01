package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
  router := gin.Default()
  router.Use(cors.Default())
  router.MaxMultipartMemory = 8 << 20  // 8 MiB

  router.POST("/upload", func(c *gin.Context) {
    file, _ := c.FormFile("file")
    log.Println(file.Filename)

    c.SaveUploadedFile(file, "./files/" + file.Filename)

    c.String(http.StatusOK, fmt.Sprintf("'%s' uploaded!", file.Filename))
  })
  router.Run(":8080")
}