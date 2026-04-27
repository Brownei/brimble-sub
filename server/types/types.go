package types

type DeploymentRequest struct {
	Name   string `json:"name"`
	GitURL string `json:"git_url"`
	Branch string `json:"branch"`
	Port   int    `json:"port"`
}

type UploadRequest struct {
	Name string `json:"name"`
	Port int    `json:"port"`
}
