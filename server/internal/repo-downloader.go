// simple_downloader.go
package internal

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// SimpleGitHubDownloader uses only standard library
type SimpleGitHubDownloader struct {
	client *http.Client
}

func NewSimpleGitHubDownloader() *SimpleGitHubDownloader {
	return &SimpleGitHubDownloader{
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

// DownloadRepo downloads a GitHub repository as ZIP (no Git required!)
func (d *SimpleGitHubDownloader) DownloadRepo(ctx context.Context, gitURL, branch, destPath string) error {
	// Parse GitHub URL
	owner, repo := parseGitHubURL(gitURL)
	if owner == "" || repo == "" {
		return fmt.Errorf("invalid GitHub URL. Use format like: https://github.com/user/repo")
	}

	// GitHub's direct ZIP download URL (no authentication needed for public repos)
	downloadURL := fmt.Sprintf("https://github.com/%s/%s/archive/refs/heads/%s.zip", owner, repo, branch)

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return err
	}

	// Set user agent to avoid rate limiting
	req.Header.Set("User-Agent", "Deployment-System/1.0")

	// Download the ZIP file
	resp, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download: HTTP %d (repository might be private or doesn't exist)", resp.StatusCode)
	}

	// Save ZIP to temp file
	zipPath := destPath + ".temp.zip"
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	if _, err := io.Copy(zipFile, resp.Body); err != nil {
		return err
	}
	zipFile.Close()

	// Extract ZIP
	return extractZip(zipPath, destPath)
}

// Parse GitHub URL to get owner and repo
func parseGitHubURL(gitURL string) (owner, repo string) {
	// Remove .git suffix if present
	gitURL = strings.TrimSuffix(gitURL, ".git")

	// Pattern for GitHub URLs
	patterns := []string{
		`github\.com[:/]([^/]+)/([^/]+)`, // Matches both https:// and git@ formats
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(gitURL)
		if len(matches) == 3 {
			return matches[1], matches[2]
		}
	}

	return "", ""
}

// Extract ZIP file to destination
func extractZip(zipPath, destPath string) error {
	// Open ZIP file
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	// Create destination directory
	if err := os.MkdirAll(destPath, 0755); err != nil {
		return err
	}

	// Extract each file
	for _, file := range reader.File {
		// GitHub ZIPs have a root folder like "repo-branch/", we need to strip it
		pathParts := strings.SplitN(file.Name, "/", 2)
		var filePath string
		if len(pathParts) == 2 {
			filePath = pathParts[1] // Skip the root folder
		} else {
			continue // Skip the root directory entry
		}

		if filePath == "" {
			continue
		}

		fullPath := filepath.Join(destPath, filePath)

		if file.FileInfo().IsDir() {
			os.MkdirAll(fullPath, file.Mode())
			continue
		}

		// Create parent directories if needed
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			return err
		}

		// Extract the file
		srcFile, err := file.Open()
		if err != nil {
			return err
		}
		defer srcFile.Close()

		dstFile, err := os.Create(fullPath)
		if err != nil {
			return err
		}
		defer dstFile.Close()

		if _, err := io.Copy(dstFile, srcFile); err != nil {
			return err
		}
	}

	// Clean up temp ZIP file
	os.Remove(zipPath)

	return nil
}
