package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/google/uuid"
)

type Images struct {
	gorm.Model
	ObjectKey   string `gorm:"column:object_key;not null"`
	FileName    string `gorm:"column:file_name;not null"`
	ContentType string `gorm:"column:content_type;not null"`
	Size        int64  `gorm:"column:size;not null"`
}

type Presigner struct {
	PresignClient *s3.PresignClient
}

func NewPresigner(ctx context.Context) (*Presigner, error) {
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
		Bucket:      aws.String(bucketName),
		Key:         aws.String(objectKey),
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
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
		},
		AllowMethods: []string{
			"POST",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Content-Length",
		},
		MaxAge: 12 * time.Hour,
	}))
	router.MaxMultipartMemory = 8 << 20

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Tokyo",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_DATABASE"),
		os.Getenv("DB_PORT"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect DB: %v", err)
	}
	db.AutoMigrate(&Images{})

	router.POST("/api/upload-url", func(c *gin.Context) {
		type UploadURLRequest struct {
			FileName    string `json:"fileName" binding:"required"`
			ContentType string `json:"contentType" binding:"required,oneof=image/png image/jpeg"`
		}

		var req UploadURLRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		safeName := path.Base(req.FileName)
		objectKey := fmt.Sprintf("uploads/%s_%s", uuid.NewString(), safeName)

		signedReq, err := presigner.PutObject(
			c.Request.Context(),
			bucket,
			objectKey,
			req.ContentType,
			30,
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
		type SaveImageRequest struct {
			ObjectKey   string `json:"objectKey" binding:"required"`
			FileName    string `json:"fileName" binding:"required"`
			ContentType string `json:"contentType" binding:"required,oneof=image/png image/jpeg"`
			Size        int64  `json:"size" binding:"required,gt=0"`
		}
		var req SaveImageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		image := Images{
			ObjectKey:   req.ObjectKey,
			FileName:    req.FileName,
			ContentType: req.ContentType,
			Size:        req.Size,
		}

		if err := db.Create(&image).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save image"})
			return
		}

		c.JSON(http.StatusCreated, image)
	})
	router.Run(":8080")
}
