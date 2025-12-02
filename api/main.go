package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Images struct {
	gorm.Model
	Name string
}

type Presigner struct {
	PresignClient *s3.PresignClient
}

func NewPresigner(ctx context.Context) (*Presigner, error){
	region := os.Getenv("AWS_REGION")
	if region == "" {
		return nil, fmt.Errorf("AWS_REGION is not set")
	}

	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	s3Client := s3.NewFromConfig(cfg)
	presignClient := s3.NewPresignClient(s3Client)

	return &Presigner{
		PresignClient: presignClient,
	}, nil
}

func (presigner *Presigner) PutObject(
	ctx context.Context,
	bucketName string,
	objectKey string,
	contentType string, 
	lifetimeSecs int64,
) (*v4.PresignedHTTPRequest, error) {
	request, err := presigner.PresignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(objectKey),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(lifetimeSecs * int64(time.Second))
	})
	if err != nil {
		log.Printf("Couldn't get a presigned request to put %v:%v. Here's why: %v\n",
			bucketName, objectKey, err)
		return nil, err
	}
	return request, nil
}

func main() {
	ctx := context.Background()

    presigner, err := NewPresigner(ctx)
    if err != nil {
        log.Fatalf("failed to create presigner: %v", err)
    }

    bucket := os.Getenv("AWS_S3_BUCKET")
    if bucket == "" {
        log.Fatalln("AWS_S3_BUCKET is not set")
    }

	router := gin.Default()
	router.Use(cors.Default())
	router.MaxMultipartMemory = 8 << 20 // 8 MiB

	dsn := "host=postgres user=user password=password dbname=images port=5432 sslmode=disable TimeZone=Asia/Tokyo"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect DB: %v", err)
	}
	db.AutoMigrate(&Images{})

	router.POST("/api/upload-url", func(c *gin.Context) {
		var req struct {
			FileName string `json:"fileName"`
			ContentType string `json:"contentType"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		objectKey := fmt.Sprintf("uploads/%d_%s", time.Now().Unix(), req.FileName)

		signedReq, err := presigner.PutObject(
            c.Request.Context(),
            bucket,
            objectKey,
			req.ContentType,
            60*5,
        )		
		if err != nil {
			log.Println("failed to create presigned url:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate presigned url"})
			return
    	}

		c.JSON(http.StatusOK, gin.H{
			"uploadURL": signedReq.URL,
			"objectKey": objectKey,
    	})
	})

	router.POST("/api/saveImage", func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			c.String(http.StatusBadRequest, "ファイル取得エラー")
			return
		}
		log.Println(file)

		image := Images{Name: file.Filename}
		db.Create(&image)

		c.String(http.StatusOK, fmt.Sprintf("'%v' uploaded!", file))
	})
	router.Run(":8080")
}
