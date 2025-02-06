class Gene {
  constructor(genes = 20) {
    if (Array.isArray(genes)) {
      this.genes = genes;
    } else {
      this.genes = [];
      for (let i = 0; i < genes; i++) {
        this.genes.push(Math.random());
      }
    }
  }
  
  getClone(mutationRate = 0.01, deviationRate = 0.1) {
    let newGenes = [];
    for (let i = 0; i < this.genes.length; i++) {
      if (Math.random() < mutationRate) {
        console.log("Flower mutated");
        newGenes.push(Math.random());
      } else {
        let deviation = randomGaussian() * deviationRate;
        let newGene = this.genes[i] + deviation;
        newGene = Math.min(Math.max(newGene, 0), 1);
        newGenes.push(newGene);
      }
    }
    return new Gene(newGenes);
  }
}